/**
 * RecoverFlow AI - Distributed Idempotency & Customer Cooldown Service
 * Razorpay Buildathon 2026 - Production Hardening
 * 
 * Capabilities:
 * 1. Multi-container Distributed Atomic Idempotency via SETNX with TTL
 * 2. Pluggable Redis Client with high-speed memory fallback for zero single-point-of-failure
 * 3. Atomic Customer Recovery Cooldown Tracker (prevents redundant campaigns within 60 mins)
 * 4. Automatic TTL key eviction and stale lock reclamation
 */

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
    // Background garbage collection of expired keys every 60 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, lock] of this.localLockMap.entries()) {
        if (lock.expiresAt <= now) {
          this.localLockMap.delete(key);
        }
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

    // 2. High-Performance Atomic Local Fallback
    const existing = this.localLockMap.get(key);
    if (existing && existing.expiresAt > now) {
      // Key exists and is still valid within TTL -> duplicate event rejected
      return false;
    }

    // Atomic insert
    this.localLockMap.set(key, { expiresAt, value: 'PROCESSED' });
    return true;
  }

  /**
   * Releases an idempotency lock early if processing failed and retry is allowed.
   */
  public static async releaseEventLock(eventId: string): Promise<void> {
    const key = `idemp:evt:${eventId}`;
    this.localLockMap.delete(key);

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
  }
}
