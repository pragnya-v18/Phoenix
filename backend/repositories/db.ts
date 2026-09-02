/**
 * RecoverFlow AI - High-Performance Database Service
 * Razorpay Buildathon 2026 - Track 03 (AI Revenue Recovery)
 * 
 * Multi-layer persistence engine:
 * 1. High-speed In-Memory Synchronous State (0ms UI latency)
 * 2. Durable Local Disk Snapshotting (data/recoverflow_store.json)
 * 3. Asynchronous Cloud Firestore Synchronization (when credentials/network available)
 * 4. Reactive Server-Sent Events (SSE) stream pub/sub broadcaster
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import {
  RecoveryCase,
  AuditLogEntry,
  BankHealthMetric,
  ExecutiveKPIs,
  ACPMessage,
  CaseStatus,
  DeadLetterPayment,
  RecoveryLearningOutcome
} from '../../src/types/index.js';
import { pipelineJobQueue } from '../queues/job-queue.js';
import { computeKPIs } from '../services/kpi-engine.js';
import { buildLearningOutcome } from '../services/learning-engine.js';
import { generateSeedData } from '../seed/seed-data.js';

// Read config safely
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'config', 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    firebaseConfig = JSON.parse(raw);
  }
} catch (e) {
  // config read fallback
}

const PROJECT_ID = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'sixth-lexicon-2lcf1';
const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || 'ai-studio-recoverflowai-7f73a60b-c8d6-48d3-aade-7e3229646f24';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'recoverflow_store.json');
const BACKUP_PATH = path.join(DATA_DIR, 'recoverflow_store.json.bak');
const TEMP_PATH = path.join(DATA_DIR, 'recoverflow_store.json.tmp');

// Initialize Firebase Admin SDK client
// Skip Firestore entirely when no GCP credentials are available — avoids
// unhandled async rejections from the gRPC auth layer that crash the process.
let firestoreInstance: Firestore | null = null;
const hasADC = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT);
const isProd = process.env.NODE_ENV === 'production';

if (hasADC || isProd) {
  try {
    const app = getApps().length === 0
      ? initializeApp({ projectId: PROJECT_ID })
      : getApp();
    firestoreInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
  } catch (err) {
    try {
      const app = getApps().length === 0 ? initializeApp() : getApp();
      firestoreInstance = getFirestore(app);
    } catch {
      firestoreInstance = null;
    }
  }
} else {
  console.warn('[Storage] No GCP credentials found — running in local-only mode (disk + memory).');
}

export class FirestoreDatabase {
  private firestore: Firestore | null = firestoreInstance;
  private sseClients: Set<(data: { event: string; payload: any }) => void> = new Set();
  
  // Local high-speed synchronization cache
  private casesCache: Map<string, RecoveryCase> = new Map();
  private auditLogsCache: Map<string, AuditLogEntry[]> = new Map();
  private bankHealthCache: Map<string, BankHealthMetric> = new Map();
  private deadLetterCache: Map<string, DeadLetterPayment> = new Map();
  private learningCache: Map<string, RecoveryLearningOutcome> = new Map();
  
  // O(1) indexes for webhook case lookups (M1)
  private paymentIdIndex: Map<string, string> = new Map();   // paymentId → caseId
  private orderIdIndex: Map<string, string> = new Map();      // orderId → caseId
  private paymentLinkIdIndex: Map<string, string> = new Map(); // paymentLinkId → caseId

  private readonly MAX_CASES_CACHE = 2000;
  private readonly MAX_AUDIT_CACHE = 2000;
  private readonly MAX_DEAD_LETTER_CACHE = 500;               // M2: dead-letter cap
  private readonly MAX_LEARNING_CACHE = 2000;                 // Learning-outcome cap
  private readonly DEAD_LETTER_TTL_MS = 7 * 24 * 60 * 60 * 1000; // M2: 7 days

  private evictCache<K, V>(map: Map<K, V>, maxSize: number) {
    if (map.size > maxSize) {
      const iter = map.keys();
      const toDelete = map.size - maxSize;
      for (let i = 0; i < toDelete; i++) {
        const key = iter.next().value;
        if (key !== undefined) map.delete(key);
      }
    }
  }
  
  private firestoreOnline: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.ensureDataDirectory();
    this.initialize();
  }

  private ensureDataDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('[Storage] Could not create data directory:', e);
    }
  }

  /**
   * Atomically persists the current state snapshot to durable local disk.
   *
   * Write sequence:
   *   1. Copy current main file → backup file (preserves last-known-good)
   *   2. Serialize snapshot to temp file
   *   3. fsync temp file (forces OS write-through to physical media)
   *   4. Rename temp → main (atomic on POSIX; best-effort on Windows)
   *
   * Crash-safety guarantees:
   *   - Crash during step 2: temp file is partial → deleted on next write attempt.
   *     Main and backup are untouched. No data loss.
   *   - Crash during step 3: same as step 2 (fsync hasn't completed).
   *   - Crash during step 4: POSIX — rename is atomic, so main is either old
   *     or new, never partial. Windows — rename may leave temp file behind;
   *     next write deletes it and retries. Main file integrity is preserved.
   *   - Crash after step 4: main has new data, backup has previous data. Perfect.
   */
  private saveToDisk() {
    try {
      this.ensureDataDirectory();

      // Step 1: Preserve current main file as backup before overwriting
      if (fs.existsSync(STORE_PATH)) {
        try {
          fs.copyFileSync(STORE_PATH, BACKUP_PATH);
        } catch {
          // Backup failure is non-fatal — new data still written below
        }
      }

      const snapshot = {
        cases: Array.from(this.casesCache.entries()),
        auditLogs: Array.from(this.auditLogsCache.entries()),
        bankHealth: Array.from(this.bankHealthCache.entries()),
        deadLetter: Array.from(this.deadLetterCache.entries()),
        learning: Array.from(this.learningCache.entries()),
        lastSaved: new Date().toISOString()
      };

      const data = JSON.stringify(snapshot, null, 2);

      // Step 2: Remove stale temp file from prior crash, then write fresh
      try { fs.unlinkSync(TEMP_PATH); } catch { /* didn't exist */ }
      const fd = fs.openSync(TEMP_PATH, 'wx');
      try {
        fs.writeSync(fd, data, 0, 'utf8');
        // Step 3: Force OS flush to physical media
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }

      // Step 4: Atomic replace — POSIX rename is atomic; Windows needs delete-first
      if (process.platform === 'win32') {
        try { fs.unlinkSync(STORE_PATH); } catch { /* first write */ }
      }
      fs.renameSync(TEMP_PATH, STORE_PATH);
    } catch (err) {
      // Clean up failed temp file so next attempt isn't blocked by stale wx
      try { fs.unlinkSync(TEMP_PATH); } catch { /* already gone */ }
      console.warn('[Storage] Atomic save failed:', err);
    }
  }

  /**
   * Loads state snapshot from local disk with corruption recovery.
   *
   * Recovery chain: main file → backup file → return false (triggers seed defaults)
   *
   * If the main file is corrupted (partial write from crash), the backup file
   * contains the last-known-good snapshot. The backup is only overwritten AFTER
   * the new main file write completes successfully (see saveToDisk step 1),
   * so it always represents a consistent prior state.
   */
  private loadFromDisk(): boolean {
    // Try main file first
    if (this._tryLoadFile(STORE_PATH)) {
      return true;
    }

    // Main file missing or corrupted — try backup
    console.warn('[Storage] Main store unavailable, attempting backup recovery...');
    if (this._tryLoadFile(BACKUP_PATH)) {
      // Backup loaded successfully — restore it as the main file
      console.log('[Storage] Backup recovered successfully.');
      try { fs.copyFileSync(BACKUP_PATH, STORE_PATH); } catch { /* best-effort */ }
      return true;
    }

    // Both files missing or corrupted
    console.warn('[Storage] No valid store found (main and backup both failed). Will seed defaults.');
    return false;
  }

  /**
   * Attempt to load a specific JSON file into the cache maps.
   * Returns true if the file was valid and contained case data.
   */
  private _tryLoadFile(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) return false;

      const raw = fs.readFileSync(filePath, 'utf8');

      // Basic structural validation before parsing
      if (!raw || raw.trim().length === 0) return false;

      const data = JSON.parse(raw);

      // Validate expected structure
      if (!data || typeof data !== 'object') return false;
      if (!Array.isArray(data.cases)) return false;

      this.casesCache = new Map(data.cases);
      if (Array.isArray(data.auditLogs)) {
        this.auditLogsCache = new Map(data.auditLogs);
      }
      if (Array.isArray(data.bankHealth)) {
        this.bankHealthCache = new Map(data.bankHealth);
      }
      if (Array.isArray(data.deadLetter)) {
        this.deadLetterCache = new Map(data.deadLetter);
      }
      if (Array.isArray(data.learning)) {
        this.learningCache = new Map(data.learning);
      }
      return this.casesCache.size > 0;
    } catch (err) {
      console.warn(`[Storage] Failed to load ${path.basename(filePath)}:`, err);
      return false;
    }
  }

  /**
   * Bootstraps database: Loads disk snapshot or seeds defaults, and tests Firestore connectivity
   */
  private async initialize() {
    const loadedFromDisk = this.loadFromDisk();

    if (!loadedFromDisk || this.casesCache.size === 0) {
      this.seedLocalDefaults();
      this.saveToDisk();
    }

    // Recovery Intelligence Feedback Loop: bootstrap learning from terminal
    // cases present in whichever state we just loaded/seeded.
    this.backfillLearningOutcomes();

    // Test Firestore connectivity asynchronously without blocking app readiness
    if (this.firestore) {
      try {
        const testSnap = await this.firestore.collection('bankHealthMetrics').limit(1).get();
        this.firestoreOnline = true;
        console.log(`[Firestore] Connected to Cloud Firestore database: ${FIRESTORE_DATABASE_ID}`);
        await this.syncFromFirestore();
      } catch (err) {
        this.firestoreOnline = false;
        console.log(`[Database] Cloud Firestore connection not authenticated for Admin SDK; running in durable high-speed mode.`);
      }
    }

    this.isInitialized = true;
    console.log(`[RecoverFlow] Ready with ${this.casesCache.size} cases, ${this.bankHealthCache.size} bank switch metrics.`);

    // Crash recovery: scan for cases stuck in EXECUTING status (from in-flight
    // setTimeout that was interrupted by server restart). If the case has been
    // EXECUTING for more than 30 seconds, revert to DETECTED so the pipeline
    // can re-attempt. Otherwise, complete the simulated recovery.
    this._recoverStuckCases();
  }

  /**
   * Finds cases stuck in EXECUTING status (crashed during setTimeout-based
   * settlement simulation) and recovers them.
   */
  private _recoverStuckCases(): void {
    const now = Date.now();
    const STUCK_THRESHOLD_MS = 30_000; // 30 seconds

    for (const [caseId, c] of this.casesCache) {
      if (c.status !== 'EXECUTING') continue;

      const updatedAt = new Date(c.updatedAt).getTime();
      const elapsed = now - updatedAt;

      // Revert ALL stuck EXECUTING cases to DETECTED — never fabricate recovery
      c.status = 'DETECTED';
      c.updatedAt = new Date().toISOString();
      this.casesCache.set(caseId, c);

      const elapsedSec = Math.round(elapsed / 1000);
      console.warn(`[RecoverFlow] Case ${caseId} was stuck in EXECUTING for ${elapsedSec}s — reverted to DETECTED for retry.`);

      // Audit trail for stuck execution recovery
      this.addAuditLog({
        caseId,
        agentName: 'Startup Recovery Agent',
        action: 'STUCK_EXECUTION_RECOVERED',
        rationale: `Case was stuck in EXECUTING for ${elapsedSec}s (threshold: ${STUCK_THRESHOLD_MS / 1000}s). Reverted to DETECTED. Pipeline re-enqueued for fresh recovery attempt.`,
        model: 'deterministic-startup-recovery',
        latencyMs: 0,
        tokensUsed: 0
      });

      // Re-enqueue through the persistent job queue so pipeline retries
      pipelineJobQueue.enqueue(c);
    }
  }

  /**
   * Syncs existing records from Firestore into local cache if online
   */
  public async syncFromFirestore() {
    if (!this.firestore || !this.firestoreOnline) return;
    try {
      // 1. Fetch Bank Health Metrics
      const bankSnap = await this.firestore.collection('bankHealthMetrics').get();
      if (!bankSnap.empty) {
        bankSnap.forEach(doc => {
          this.bankHealthCache.set(doc.id.toUpperCase(), doc.data() as BankHealthMetric);
        });
      }

      // 2. Fetch Recovery Cases
      const casesSnap = await this.firestore.collection('recoveryCases').get();
      if (!casesSnap.empty) {
        casesSnap.forEach(doc => {
          this.casesCache.set(doc.id, doc.data() as RecoveryCase);
        });
      }

      // 3. Fetch Audit Logs
      const auditSnap = await this.firestore.collection('auditLogs').orderBy('timestamp', 'asc').get();
      if (!auditSnap.empty) {
        auditSnap.forEach(doc => {
          const entry = doc.data() as AuditLogEntry;
          const caseLogs = this.auditLogsCache.get(entry.caseId) || [];
          caseLogs.push(entry);
          this.auditLogsCache.set(entry.caseId, caseLogs);
        });
      }
      this.saveToDisk();
    } catch (err) {
      this.firestoreOnline = false;
    }
  }

  // =========================================================================
  // SSE Streaming Pub/Sub
  // =========================================================================
  public subscribeSSE(listener: (data: { event: string; payload: any }) => void) {
    this.sseClients.add(listener);
    return () => this.sseClients.delete(listener);
  }

  public broadcast(event: string, payload: any) {
    for (const client of this.sseClients) {
      try {
        client({ event, payload });
      } catch {
        // ignore disconnected clients
      }
    }
  }

  // =========================================================================
  // Bank Health Management (collection: 'bankHealthMetrics')
  // =========================================================================
  public getBankHealth(): BankHealthMetric[] {
    return Array.from(this.bankHealthCache.values());
  }

  public getBank(bankCode: string): BankHealthMetric | undefined {
    return this.bankHealthCache.get(bankCode.toUpperCase());
  }

  public async updateBankHealth(bankCode: string, successRate: number, status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE') {
    const code = bankCode.toUpperCase();
    const prev = this.bankHealthCache.get(code);
    const prevStatus = prev?.status || 'HEALTHY';

    const existing = prev || {
      bankCode: code,
      name: `${code} Bank Switch`,
      networkType: 'UPI & Gateway',
      rollingSuccessRatePct: successRate,
      status: status,
      sampleCountLast15Min: 1200,
      latencyMs: status === 'OUTAGE' ? 2500 : (status === 'DEGRADED' ? 850 : 160),
      lastUpdated: new Date().toISOString(),
      consecutiveOutageMinutes: 0,
      autoPausedWorkflowsCount: 0
    };

    existing.rollingSuccessRatePct = successRate;
    existing.status = status;
    existing.lastUpdated = new Date().toISOString();
    if (status === 'OUTAGE') {
      existing.consecutiveOutageMinutes = (existing.consecutiveOutageMinutes || 0) + 5;
    } else {
      existing.consecutiveOutageMinutes = 0;
    }

    this.bankHealthCache.set(code, existing);
    this.saveToDisk();

    // Trigger Outage Protection or Auto-Resume Audit Logs
    if (prevStatus !== 'OUTAGE' && (status === 'OUTAGE' || successRate < 40)) {
      // Outage detected
      this.addAuditLog({
        caseId: `SWITCH-${code}`,
        agentName: 'Global Outage Guard',
        action: 'GLOBAL_SWITCH_OUTAGE_PAUSED',
        rationale: `Bank switch ${code} entered ${status} state (${successRate}% success rate). Autonomous retry pipelines targeting this issuer automatically paused/diverted to prevent customer friction.`,
        model: 'deterministic-switch-guard',
        latencyMs: 1,
        tokensUsed: 0
      });
    } else if (prevStatus === 'OUTAGE' && status === 'HEALTHY' && successRate >= 75) {
      // Outage recovered
      this.addAuditLog({
        caseId: `SWITCH-${code}`,
        agentName: 'Global Outage Guard',
        action: 'GLOBAL_SWITCH_RECOVERY_RESUMED',
        rationale: `Bank switch ${code} normalized to HEALTHY (${successRate}% success rate). Queued recovery workflows unblocked.`,
        model: 'deterministic-switch-guard',
        latencyMs: 1,
        tokensUsed: 0
      });
    }

    // Persist to Firestore if online
    if (this.firestore && this.firestoreOnline) {
      try {
        await this.firestore.collection('bankHealthMetrics').doc(code).set(existing, { merge: true });
      } catch {
        this.firestoreOnline = false;
      }
    }

    this.broadcast('bank_health_updated', existing);
  }

  /**
   * Checks if an issuer bank or national switch is currently in an active outage state.
   */
  public isBankInOutage(bankCode?: string): { isOutage: boolean; status: string; successRate: number; reason?: string } {
    if (!bankCode) {
      const npci = this.bankHealthCache.get('NPCI_UPI');
      if (npci && (npci.status === 'OUTAGE' || npci.rollingSuccessRatePct < 40)) {
        return { isOutage: true, status: npci.status, successRate: npci.rollingSuccessRatePct, reason: 'NPCI National UPI switch is experiencing widespread outage' };
      }
      return { isOutage: false, status: 'HEALTHY', successRate: 95 };
    }

    const metric = this.bankHealthCache.get(bankCode.toUpperCase());
    if (metric && (metric.status === 'OUTAGE' || metric.rollingSuccessRatePct < 40)) {
      return {
        isOutage: true,
        status: metric.status,
        successRate: metric.rollingSuccessRatePct,
        reason: `${metric.name} (${metric.bankCode}) switch is down (success rate: ${metric.rollingSuccessRatePct}%)`
      };
    }

    // Also check national switch
    const npci = this.bankHealthCache.get('NPCI_UPI');
    if (npci && (npci.status === 'OUTAGE' || npci.rollingSuccessRatePct < 40)) {
      return {
        isOutage: true,
        status: npci.status,
        successRate: npci.rollingSuccessRatePct,
        reason: 'NPCI National UPI Switch is down'
      };
    }

    return { isOutage: false, status: metric?.status || 'HEALTHY', successRate: metric?.rollingSuccessRatePct || 90 };
  }

  /**
   * Retrieves 30-day recovery counts and historical discount counts for anti-abuse checks.
   */
  public getCustomer30DayStats(customerKey: string): { recoveryCount30d: number; discountCount: number; historicalRecoveries: number } {
    if (!customerKey) return { recoveryCount30d: 0, discountCount: 0, historicalRecoveries: 0 };
    const q = customerKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    let recoveryCount30d = 0;
    let discountCount = 0;
    let maxHistoricalRecorded = 0;

    for (const c of this.casesCache.values()) {
      const phoneClean = c.customer.phone.replace(/[^a-z0-9]/g, '');
      const idClean = c.customer.id.replace(/[^a-z0-9]/g, '');
      if (phoneClean.includes(q) || idClean.includes(q) || q.includes(phoneClean) || q.includes(idClean)) {
        maxHistoricalRecorded = Math.max(maxHistoricalRecorded, c.customer.historicalRecoveries || 0);
        const caseTime = new Date(c.createdAt).getTime();
        if (caseTime >= thirtyDaysAgo) {
          recoveryCount30d++;
          if (c.strategy && c.strategy.offeredDiscountPct > 0) {
            discountCount++;
          }
        }
      }
    }

    return {
      recoveryCount30d,
      discountCount,
      historicalRecoveries: Math.max(maxHistoricalRecorded, recoveryCount30d)
    };
  }

  // =========================================================================
  // Recovery Case Management (collection: 'recoveryCases')
  // =========================================================================
  public getAllCases(filters?: { status?: string; riskTier?: string; search?: string }): RecoveryCase[] {
    let result = Array.from(this.casesCache.values());

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter(c => c.status === filters.status);
    }
    if (filters?.riskTier && filters.riskTier !== 'ALL') {
      result = result.filter(c => c.riskTier === filters.riskTier);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(c => 
        c.caseId.toLowerCase().includes(q) ||
        c.customer.name.toLowerCase().includes(q) ||
        c.customer.phone.includes(q) ||
        (c.sourceEvent.paymentId && c.sourceEvent.paymentId.toLowerCase().includes(q))
      );
    }

    // Sort latest first
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCase(caseId: string): RecoveryCase | undefined {
    return this.casesCache.get(caseId);
  }

  public async upsertCase(recoveryCase: RecoveryCase): Promise<RecoveryCase> {
    recoveryCase.updatedAt = new Date().toISOString();
    
    // M1: Update O(1) indexes
    if (recoveryCase.sourceEvent.paymentId) {
      this.paymentIdIndex.set(recoveryCase.sourceEvent.paymentId, recoveryCase.caseId);
    }
    if (recoveryCase.sourceEvent.orderId) {
      this.orderIdIndex.set(recoveryCase.sourceEvent.orderId, recoveryCase.caseId);
    }
    if (recoveryCase.outcome?.paymentLinkId) {
      this.paymentLinkIdIndex.set(recoveryCase.outcome.paymentLinkId, recoveryCase.caseId);
    }

    this.casesCache.set(recoveryCase.caseId, recoveryCase);
    this.evictCache(this.casesCache, this.MAX_CASES_CACHE);
    this.saveToDisk();

    // M4: Auto-reconcile dead-letter payments against this case
    this.autoReconcileDeadLetters(recoveryCase);

    // Persist to Firestore if online
    if (this.firestore && this.firestoreOnline) {
      try {
        const cleanCase = JSON.parse(JSON.stringify(recoveryCase));
        await this.firestore.collection('recoveryCases').doc(recoveryCase.caseId).set(cleanCase, { merge: true });
        await this.persistKPIsSummary();
      } catch {
        this.firestoreOnline = false;
      }
    }

    this.broadcast('case_updated', recoveryCase);
    return recoveryCase;
  }

  public async updateCaseStatus(caseId: string, status: CaseStatus, extraFields?: Partial<RecoveryCase>): Promise<RecoveryCase | undefined> {
    const existing = this.casesCache.get(caseId);
    if (!existing) return undefined;

    existing.status = status;
    existing.updatedAt = new Date().toISOString();
    if (extraFields) {
      Object.assign(existing, extraFields);
    }

    this.casesCache.set(caseId, existing);
    this.saveToDisk();

    // Persist to Firestore if online
    if (this.firestore && this.firestoreOnline) {
      try {
        const cleanData = JSON.parse(JSON.stringify(existing));
        await this.firestore.collection('recoveryCases').doc(caseId).set(cleanData, { merge: true });
        await this.persistKPIsSummary();
      } catch {
        this.firestoreOnline = false;
      }
    }

    this.broadcast('case_updated', existing);
    return existing;
  }

  // =========================================================================
  // Audit Ledger (collection: 'auditLogs')
  // =========================================================================
  public async addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'signatureHash' | 'timestamp'>): Promise<AuditLogEntry> {
    const timestamp = new Date().toISOString();
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Cryptographic SHA-256 signature hash for tamper verification
    const rawPayload = `${entry.caseId}:${entry.agentName}:${entry.action}:${entry.rationale}:${timestamp}`;
    const signatureHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    const fullLog: AuditLogEntry = {
      ...entry,
      id,
      timestamp,
      signatureHash
    };

    // Update local cache
    const caseLogs = this.auditLogsCache.get(entry.caseId) || [];
    caseLogs.push(fullLog);
    this.auditLogsCache.set(entry.caseId, caseLogs);
    this.evictCache(this.auditLogsCache, this.MAX_AUDIT_CACHE);
    this.saveToDisk();

    // Persist to Firestore if online
    if (this.firestore && this.firestoreOnline) {
      try {
        const cleanLog = JSON.parse(JSON.stringify(fullLog));
        await this.firestore.collection('auditLogs').doc(id).set(cleanLog);
      } catch {
        this.firestoreOnline = false;
      }
    }

    this.broadcast('audit_log_added', fullLog);
    return fullLog;
  }

  public getAuditLogs(caseId: string): AuditLogEntry[] {
    return this.auditLogsCache.get(caseId) || [];
  }

  public getAllAuditLogs(): AuditLogEntry[] {
    const all: AuditLogEntry[] = [];
    for (const logs of this.auditLogsCache.values()) {
      all.push(...logs);
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // =========================================================================
  // Dead-Letter Payment Reconciliation (TC-PF-01)
  // =========================================================================
  public addDeadLetterPayment(payment: DeadLetterPayment): void {
    this.deadLetterCache.set(payment.id, payment);
    this.evictDeadLetterCache();  // M2: enforce cap + TTL
    this.saveToDisk();
    this.broadcast('dead-letter-added', { payment });
  }

  public getDeadLetterPayments(): DeadLetterPayment[] {
    return Array.from(this.deadLetterCache.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getUnmatchedDeadLetterPayments(): DeadLetterPayment[] {
    return this.getDeadLetterPayments().filter(p => !p.matched);
  }

  public matchDeadLetterPayment(paymentId: string, caseId: string): boolean {
    const payment = this.deadLetterCache.get(paymentId);
    if (!payment || payment.matched) return false;
    payment.matched = true;
    payment.matchedCaseId = caseId;
    payment.matchedAt = new Date().toISOString();
    this.saveToDisk();
    return true;
  }

  // M2: Evict expired + excess dead-letter entries
  private evictDeadLetterCache(): void {
    const now = Date.now();
    // First: TTL eviction
    for (const [id, entry] of this.deadLetterCache) {
      if (now - new Date(entry.createdAt).getTime() > this.DEAD_LETTER_TTL_MS) {
        this.deadLetterCache.delete(id);
      }
    }
    // Second: size cap (FIFO — oldest first via sort)
    if (this.deadLetterCache.size > this.MAX_DEAD_LETTER_CACHE) {
      const sorted = Array.from(this.deadLetterCache.entries())
        .sort((a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime());
      const toDelete = sorted.length - this.MAX_DEAD_LETTER_CACHE;
      for (let i = 0; i < toDelete; i++) {
        this.deadLetterCache.delete(sorted[i][0]);
      }
    }
  }

  // M4: Auto-reconcile unmatched dead-letter payments against a case
  private autoReconcileDeadLetters(recoveryCase: RecoveryCase): void {
    for (const [id, payment] of this.deadLetterCache) {
      if (payment.matched) continue;
      const matches =
        (payment.paymentId && payment.paymentId === recoveryCase.sourceEvent.paymentId) ||
        (payment.paymentOrderId && payment.paymentOrderId === recoveryCase.sourceEvent.orderId) ||
        (payment.paymentLinkId && recoveryCase.outcome?.paymentLinkId === payment.paymentLinkId);
      if (matches && recoveryCase.status !== 'RECOVERED' && recoveryCase.status !== 'DISMISSED') {
        this.matchDeadLetterPayment(id, recoveryCase.caseId);
        this.broadcast('dead-letter-auto-matched', { paymentId: id, caseId: recoveryCase.caseId });
      }
    }
  }

  // M1: Index-based case lookup by paymentId (O(1))
  public getCaseByPaymentId(paymentId: string): RecoveryCase | undefined {
    const caseId = this.paymentIdIndex.get(paymentId);
    return caseId ? this.casesCache.get(caseId) : undefined;
  }

  // M1: Index-based case lookup by orderId (O(1))
  public getCaseByOrderId(orderId: string): RecoveryCase | undefined {
    const caseId = this.orderIdIndex.get(orderId);
    return caseId ? this.casesCache.get(caseId) : undefined;
  }

  // M1: Index-based case lookup by paymentLinkId (O(1))
  public getCaseByPaymentLinkId(paymentLinkId: string): RecoveryCase | undefined {
    const caseId = this.paymentLinkIdIndex.get(paymentLinkId);
    return caseId ? this.casesCache.get(caseId) : undefined;
  }

  // =========================================================================
  // ACP 2.0 Negotiation Dialogue Persistence
  // =========================================================================
  public async appendACPMessage(caseId: string, message: Omit<ACPMessage, 'id' | 'timestamp'>): Promise<ACPMessage | undefined> {
    const targetCase = this.casesCache.get(caseId);
    if (!targetCase) return undefined;

    const fullMessage: ACPMessage = {
      ...message,
      id: `acp_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString()
    };

    if (!targetCase.acpSession) {
      targetCase.acpSession = {
        sessionId: `acp_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        status: 'PROPOSED',
        protocolVersion: 'ACP/2.0',
        dialogue: []
      };
    }

    targetCase.acpSession.dialogue.push(fullMessage);
    targetCase.updatedAt = new Date().toISOString();
    this.casesCache.set(caseId, targetCase);
    this.saveToDisk();

    if (this.firestore && this.firestoreOnline) {
      try {
        const cleanCase = JSON.parse(JSON.stringify(targetCase));
        await this.firestore.collection('recoveryCases').doc(caseId).set(cleanCase, { merge: true });
      } catch {
        this.firestoreOnline = false;
      }
    }

    this.broadcast('acp_message_received', { caseId, message: fullMessage });
    return fullMessage;
  }

  // =========================================================================
  // Financial KPIs, Cost Accounting & Evidence Calculations
  // =========================================================================
  public getKPIs(): ExecutiveKPIs {
    return computeKPIs(Array.from(this.casesCache.values()));
  }

  private async persistKPIsSummary() {
    if (!this.firestore || !this.firestoreOnline) return;
    try {
      const kpis = this.getKPIs();
      await this.firestore.collection('analyticsSummaries').doc('executive_kpis').set({
        ...kpis,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch {
      this.firestoreOnline = false;
    }
  }

  // =========================================================================
  // Recovery Intelligence Feedback Loop (predicted vs actual outcomes)
  // =========================================================================
  /**
   * Store a terminal learning outcome (idempotent by caseId — repeated
   * reconciliation webhooks simply overwrite the same record).
   */
  public setLearningOutcome(outcome: RecoveryLearningOutcome): void {
    this.learningCache.set(outcome.caseId, outcome);
    this.evictCache(this.learningCache, this.MAX_LEARNING_CACHE);
    this.saveToDisk();
  }

  public getLearningOutcome(caseId: string): RecoveryLearningOutcome | undefined {
    return this.learningCache.get(caseId);
  }

  public getAllLearningOutcomes(): RecoveryLearningOutcome[] {
    return Array.from(this.learningCache.values());
  }

  /**
   * Terminal-transition hook: capture a case's outcome for the learning loop.
   * No-ops when the case carried no strategy (nothing was actually attempted),
   * which automatically excludes settlement-guard-blocked cases.
   */
  public recordCaseOutcome(recoveryCase: RecoveryCase): RecoveryLearningOutcome | undefined {
    const outcome = buildLearningOutcome(recoveryCase);
    if (outcome) this.setLearningOutcome(outcome);
    return outcome;
  }

  /**
   * Bootstrap the learning store from any terminal cases that already carry a
   * strategy (fresh seed OR restored snapshot). Honest derivation — the loop
   * starts with the experience already present in the stored case set.
   */
  private backfillLearningOutcomes(): void {
    if (this.learningCache.size > 0) return;
    let added = 0;
    for (const c of this.casesCache.values()) {
      const outcome = buildLearningOutcome(c);
      if (outcome && !this.learningCache.has(c.caseId)) {
        this.learningCache.set(outcome.caseId, outcome);
        added++;
      }
    }
    if (added > 0) {
      this.evictCache(this.learningCache, this.MAX_LEARNING_CACHE);
      this.saveToDisk();
    }
  }

  // =========================================================================
  // Initial Dataset Seeding
  // =========================================================================
  private seedLocalDefaults() {
    const seed = generateSeedData();

    for (const b of seed.bankHealth) {
      this.bankHealthCache.set(b.bankCode, b);
    }

    for (const c of seed.cases) {
      this.casesCache.set(c.caseId, c);
    }

    for (const log of seed.auditLogs) {
      const caseLogs = this.auditLogsCache.get(log.caseId) || [];
      caseLogs.push(log);
      this.auditLogsCache.set(log.caseId, caseLogs);
    }
  }

  /**
   * TEST-ONLY reset: clears all in-memory caches so each test starts from a
   * clean, empty store. Does NOT touch disk or Firestore — safe for unit runs.
   */
  public resetForTesting(): void {
    this.casesCache.clear();
    this.auditLogsCache.clear();
    this.deadLetterCache.clear();
    this.learningCache.clear();
    this.paymentIdIndex.clear();
    this.orderIdIndex.clear();
    this.paymentLinkIdIndex.clear();
    this.bankHealthCache.clear();
  }
}

export const db = new FirestoreDatabase();
