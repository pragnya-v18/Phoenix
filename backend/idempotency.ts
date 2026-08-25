/**
 * RecoverFlow AI - Distributed Idempotency & Customer Cooldown Service
 * Razorpay Buildathon 2026 - Production Hardening
 * 
 * Capabilities:
 * 1. Multi-container Distributed Atomic Idempotency via SETNX with TTL
 * 2. Pluggable Redis Client with high-speed memory fallback for zero single-point-of-failure
 * 3. Persistent disk-backed event locks that survive server restarts (TC-SR-03)
 * 4. Atomic Customer Recovery Cooldown Tracker (prevents redundant campaigns within 60 mins)
 * 5. Automatic TTL key eviction and stale lock reclamation
 *
 * Persistence strategy:
 * - Event locks are written to data/idempotency_locks.json after every acquisition
 * - On startup, locks are loaded from disk (expired entries are pruned)
 * - Cleanup removes expired entries from both memory and disk every 60s
 * - Atomic write pattern (temp + fsync + rename) prevents corruption on crash
 *
 * Multi-instance note:
 * - Without Redis, each process has its own lock file. Two processes CAN both
 *   process the same event. For true cross-process idempotency, configure REDIS_URL.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCKS_PATH = path.join(DATA_DIR, 'idempotency_locks.json');
const LOCKS_TEMP = path.join(DATA_DIR, 'idempotency_locks.json.tmp');

export interface CooldownCheckResult {
  isCoolingDown: boolean;
  remainingMinutes: number;
  lastCampaignAt?: string;
}

export class IdempotencyService {
  // Synchronous atomic in-process store with millisecond TTL expiry (Redis fallback/multi-tenant)
  private static localLockMap: Map<string, { expiresAt: number; value: string }> = new Map();
  private static customerCooldownMap: Map<string, { lastCampaignAt: number; windowMinutes: number }> = new Map();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static {
    // Load persisted locks from disk on startup (survives restarts)
    this._loadLocksFromDisk();

    // Background garbage collection of expired keys every 60 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const [key, lock] of this.localLockMap.entries()) {
        if (lock.expiresAt <= now) {
          this.localLockMap.delete(key);
          changed = true;
        }
      }
      // Evict expired customer cooldown entries
      for (const [key, entry] of this.customerCooldownMap.entries()) {
        const elapsedMs = now - entry.lastCampaignAt;
        if (elapsedMs > entry.windowMinutes * 60 * 1000) {
          this.customerCooldownMap.delete(key);
        }
      }

      // Persist cleaned locks to disk (removes expired entries)
      if (changed) {
        this._persistLocksToDiskAsync();
      }
    }, 60000);
    // Unref interval to not block process teardown
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Attempts to acquire an atomic idempotency lock for an event ID using SETNX semantics.
   * Returns `true` if lock acquired (first time seeing this event).
   * Returns `false` if event is already processing or has been processed (duplicate).
   * 
   * Locks are persisted to disk so they survive server restarts (TC-SR-03 fix).
   * 
   * @param eventId Unique webhook or event ID (e.g. `evt_pay_992182`)
   * @param ttlSeconds Lock duration in seconds (default 86400 = 24 hours)
   */
  public static async tryAcquireEventLock(eventId: string, ttlSeconds: number = 86400): Promise<boolean> {
    const key = `idemp:evt:${eventId}`;
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);

    // 1. Try Redis if connection available
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && (globalThis as any).__redisClient) {
      try {
        const client = (globalThis as any).__redisClient;
        const res = await client.set(key, 'PROCESSING', {
          NX: true,
          EX: ttlSeconds
        });
        return res === 'OK';
      } catch (err) {
        console.warn('[IdempotencyService] Redis SETNX error, falling back to atomic local lock:', err);
      }
    }

    // 2. High-Performance Atomic Local Fallback (disk-persisted)
    const existing = this.localLockMap.get(key);
    if (existing && existing.expiresAt > now) {
      // Key exists and is still valid within TTL -> duplicate event rejected
      return false;
    }

    // Atomic insert — memory is authoritative, disk is best-effort async
    this.localLockMap.set(key, { expiresAt, value: 'PROCESSED' });
    this._persistLocksToDiskAsync();
    return true;
  }

  /**
   * Releases an idempotency lock early if processing failed and retry is allowed.
   */
  public static async releaseEventLock(eventId: string): Promise<void> {
    const key = `idemp:evt:${eventId}`;
    this.localLockMap.delete(key);
    this._persistLocksToDiskAsync();

    if (process.env.REDIS_URL && (globalThis as any).__redisClient) {
      try {
        await (globalThis as any).__redisClient.del(key);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Checks if a customer is currently in the recovery campaign cooldown window.
   * Protects end users from notification spam during payment retry bursts.
   * 
   * @param customerKey Phone number, customer ID, or email
   * @param cooldownMinutes Cooldown duration in minutes (default 60 minutes)
   */
  public static async checkCustomerCooldown(
    customerKey: string,
    cooldownMinutes: number = 60
  ): Promise<CooldownCheckResult> {
    if (!customerKey) {
      return { isCoolingDown: false, remainingMinutes: 0 };
    }

    const cleanKey = customerKey.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const entry = this.customerCooldownMap.get(cleanKey);

    if (!entry) {
      return { isCoolingDown: false, remainingMinutes: 0 };
    }

    const now = Date.now();
    const elapsedMinutes = (now - entry.lastCampaignAt) / (1000 * 60);

    if (elapsedMinutes < entry.windowMinutes) {
      const remainingMinutes = Math.ceil(entry.windowMinutes - elapsedMinutes);
      return {
        isCoolingDown: true,
        remainingMinutes,
        lastCampaignAt: new Date(entry.lastCampaignAt).toISOString()
      };
    }

    return {
      isCoolingDown: false,
      remainingMinutes: 0,
      lastCampaignAt: new Date(entry.lastCampaignAt).toISOString()
    };
  }

  /**
   * Records that a recovery campaign was launched for a customer, initiating the cooldown window.
   */
  public static async recordCustomerCampaign(
    customerKey: string,
    cooldownMinutes: number = 60
  ): Promise<void> {
    if (!customerKey) return;
    const cleanKey = customerKey.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    this.customerCooldownMap.set(cleanKey, {
      lastCampaignAt: Date.now(),
      windowMinutes: cooldownMinutes
    });
  }

  /**
   * Resets cooldown for testing and simulator resets.
   */
  public static resetAll(): void {
    this.localLockMap.clear();
    this.customerCooldownMap.clear();
    this._persistLocksToDiskAsync();
  }

  // =========================================================================
  // Disk Persistence — atomic write (temp + fsync + rename)
  // =========================================================================

  /**
   * Persist the in-memory lock map to disk using atomic write pattern.
   * Non-blocking: uses async fs APIs with fire-and-forget. If the write fails,
   * the in-memory lock is still authoritative — the webhook processed successfully.
   * A failed disk write means the lock may not survive a restart (same as pre-fix).
   */
  private static _persistLocksToDiskAsync(): void {
    const snapshot: Record<string, number> = {};
    for (const [key, lock] of this.localLockMap) {
      snapshot[key] = lock.expiresAt;
    }

    const data = JSON.stringify(snapshot);

    // Fire-and-forget: async write, no await, no blocking
    fs.promises.mkdir(DATA_DIR, { recursive: true }).then(() => {
      return fs.promises.open(LOCKS_TEMP, 'wx');
    }).then(fd => {
      return fd.writeFile(data, 'utf8').then(() => fd.sync()).then(() => fd.close());
    }).then(() => {
      if (process.platform === 'win32') {
        return fs.promises.unlink(LOCKS_PATH).catch(() => {});
      }
    }).then(() => {
      return fs.promises.rename(LOCKS_TEMP, LOCKS_PATH);
    }).catch(() => {
      // Best-effort: disk failure does not affect in-memory lock correctness
      fs.promises.unlink(LOCKS_TEMP).catch(() => {});
    });
  }

  /**
   * Load persisted locks from disk into memory on startup.
   * Expired entries are pruned during load.
   */
  private static _loadLocksFromDisk(): void {
    try {
      // Try main file first, then temp (in case crash happened during rename)
      for (const filePath of [LOCKS_PATH, LOCKS_TEMP]) {
        if (!fs.existsSync(filePath)) continue;

        const raw = fs.readFileSync(filePath, 'utf8');
        if (!raw || raw.trim().length === 0) continue;

        const snapshot = JSON.parse(raw);
        if (!snapshot || typeof snapshot !== 'object') continue;

        const now = Date.now();
        let loaded = 0;
        for (const [key, expiresAt] of Object.entries(snapshot)) {
          if (typeof expiresAt === 'number' && expiresAt > now) {
            this.localLockMap.set(key, { expiresAt, value: 'PROCESSED' });
            loaded++;
          }
        }

        if (loaded > 0) {
          console.log(`[IdempotencyService] Restored ${loaded} event locks from disk.`);
        }
        return; // Successfully loaded from one file — don't try the other
      }
    } catch (err) {
      console.warn('[IdempotencyService] Failed to load locks from disk:', err);
    }
  }
}
