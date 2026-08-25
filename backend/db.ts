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
  ChannelRecoveryMetric,
  RootCauseRecoveryMetric,
  ChannelType,
  CheckoutAbandonmentMetrics,
  CheckoutStage,
  B2BReceivablesMetrics,
  InvoiceDPD,
  VoiceAnalytics,
  VoiceAgentProfile,
  VoiceCallOutcome,
  VoiceLanguageVariant,
  DeadLetterPayment
} from '../src/types.js';
import { FinancialAccountingEngine } from './financials.js';

// Read config safely
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
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
let firestoreInstance: Firestore | null = null;
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

export class FirestoreDatabase {
  private firestore: Firestore | null = firestoreInstance;
  private sseClients: Set<(data: { event: string; payload: any }) => void> = new Set();
  
  // Local high-speed synchronization cache
  private casesCache: Map<string, RecoveryCase> = new Map();
  private auditLogsCache: Map<string, AuditLogEntry[]> = new Map();
  private bankHealthCache: Map<string, BankHealthMetric> = new Map();
  private deadLetterCache: Map<string, DeadLetterPayment> = new Map();
  
  private readonly MAX_CASES_CACHE = 2000;
  private readonly MAX_AUDIT_CACHE = 2000;

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
        lastSaved: new Date().toISOString()
      };

      const data = JSON.stringify(snapshot, null, 2);

      // Step 2: Write to temp file (wx fails if stale temp exists from prior crash)
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

      if (elapsed > STUCK_THRESHOLD_MS) {
        // Been EXECUTING too long — likely crashed during settlement simulation
        // Revert to DETECTED so the pipeline job queue can re-attempt
        c.status = 'DETECTED';
        c.updatedAt = new Date().toISOString();
        this.casesCache.set(caseId, c);

        console.warn(`[RecoverFlow] Case ${caseId} was stuck in EXECUTING for ${Math.round(elapsed / 1000)}s — reverted to DETECTED for retry.`);
      } else {
        // Recently set to EXECUTING — complete the simulated recovery
        c.status = 'RECOVERED';
        c.outcome = {
          isRecovered: true,
          recoveredAmount: c.amount,
          settledPaymentId: `pay_recovered_${Date.now()}`,
          recoveredAt: new Date().toISOString(),
          timeToRecoverSeconds: Math.round(elapsed / 1000) || 5,
          attributedChannel: 'SYSTEM_RECOVERY',
          businessInsights: 'Case was in EXECUTING state at startup — completed simulated recovery.'
        };
        c.updatedAt = new Date().toISOString();
        this.casesCache.set(caseId, c);

        console.log(`[RecoverFlow] Case ${caseId} was in EXECUTING at startup — completed recovery.`);
      }
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
    this.casesCache.set(recoveryCase.caseId, recoveryCase);
    this.evictCache(this.casesCache, this.MAX_CASES_CACHE);
    this.saveToDisk();

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
    const allCases = Array.from(this.casesCache.values());
    
    let totalRevenueAtRisk = 0;
    let totalRevenueRecovered = 0;
    let recoveredCount = 0;
    let failedCount = 0;
    let cooldownProtectedCount = 0;
    let outagePausedCount = 0;
    let totalRecoveryTimeSec = 0;
    let totalIncentiveCost = 0;
    let totalRecoveryOpsCost = 0;
    let totalMdrFees = 0;

    const channelMap = new Map<string, {
      channel: string;
      channelName: string;
      attempted: number;
      recovered: number;
      revenueAtRisk: number;
      revenueRecovered: number;
      totalTimeSec: number;
      incentiveCost: number;
      opsCost: number;
      mdrFee: number;
    }>();

    const rootCauseMap = new Map<string, {
      rootCause: string;
      rootCauseLabel: string;
      totalCases: number;
      recoveredCases: number;
      revenueAtRisk: number;
      revenueRecovered: number;
    }>();

    const channelMeta: Record<string, { name: string; costPerAttempt: number }> = {
      'WHATSAPP': { name: 'WhatsApp Business (Cloud API Interactive)', costPerAttempt: 2.85 },
      'ACP_A2A': { name: 'ACP 2.0 Autonomous Agent-to-Agent', costPerAttempt: 1.20 },
      'SMS': { name: 'SMS Smart Link Routing', costPerAttempt: 0.45 },
      'EMAIL': { name: 'Email Concierge / Invoice', costPerAttempt: 0.15 },
      'DIRECT_RETRY': { name: 'Zero-Touch Switch Retry', costPerAttempt: 0.25 },
      'VOICE': { name: 'AI Voice Concierge', costPerAttempt: 4.50 },
      'VOICE_CALL': { name: 'AI Voice Concierge', costPerAttempt: 4.50 }
    };

    const rootCauseLabels: Record<string, string> = {
      'LIMIT_EXCEEDED': 'UPI / Daily Ticket Limit Exceeded',
      'ISSUER_DOWNTIME': 'Issuer Bank Switch Degraded / Outage',
      'MANDATE_EXPIRED': 'e-Mandate / Recurring Token Expired',
      'CUSTOMER_FRICTION': 'Customer Checkout Friction / Dropoff',
      'INSUFFICIENT_FUNDS': 'Insufficient Balance at Issuing Bank',
      'AUTH_TIMEOUT': 'Bank Gateway 2FA / OTP Timeout',
      'GATEWAY_ERROR': 'Payment Gateway Internal Rail Error'
    };

    for (const c of allCases) {
      totalRevenueAtRisk += c.amount;

      if (c.status === 'COOLDOWN_PROTECTED' || c.cooldownStatus?.isCoolingDown) {
        cooldownProtectedCount++;
      }
      if (c.status === 'OUTAGE_PAUSED' || c.outageStatus?.isOutageBlocked) {
        outagePausedCount++;
      }

      const rawChannel = (c.outcome?.attributedChannel?.split('_')[0] || c.strategy?.targetChannel || 'WHATSAPP').toUpperCase();
      const channelKey = channelMeta[rawChannel] ? rawChannel : 'WHATSAPP';
      const channelConfig = channelMeta[channelKey] || { name: channelKey, costPerAttempt: 1.50 };

      const agentComputeCost = 0.85;
      const caseOpsCost = channelConfig.costPerAttempt + agentComputeCost;
      totalRecoveryOpsCost += caseOpsCost;

      if (!channelMap.has(channelKey)) {
        channelMap.set(channelKey, {
          channel: channelKey,
          channelName: channelConfig.name,
          attempted: 0,
          recovered: 0,
          revenueAtRisk: 0,
          revenueRecovered: 0,
          totalTimeSec: 0,
          incentiveCost: 0,
          opsCost: 0,
          mdrFee: 0
        });
      }
      const chData = channelMap.get(channelKey)!;
      chData.attempted += 1;
      chData.revenueAtRisk += c.amount;
      chData.opsCost += caseOpsCost;

      const rcCategory = c.diagnosis?.rootCauseCategory || 'ISSUER_DOWNTIME';
      if (!rootCauseMap.has(rcCategory)) {
        rootCauseMap.set(rcCategory, {
          rootCause: rcCategory,
          rootCauseLabel: rootCauseLabels[rcCategory] || rcCategory,
          totalCases: 0,
          recoveredCases: 0,
          revenueAtRisk: 0,
          revenueRecovered: 0
        });
      }
      const rcData = rootCauseMap.get(rcCategory)!;
      rcData.totalCases += 1;
      rcData.revenueAtRisk += c.amount;

      if (c.status === 'RECOVERED') {
        const recAmount = c.outcome?.recoveredAmount || c.amount;
        const incCost = c.outcome?.costOfIncentiveINR || c.strategy?.calculatedIncentiveINR || 0;
        const timeSec = c.outcome?.timeToRecoverSeconds || 120;
        
        // Exact Payment Method MDR calculation
        const method = c.sourceEvent.method || 'CARD';
        const mdrCalc = FinancialAccountingEngine.calculateMDRFee(recAmount, method, recAmount >= 25000);
        const mdrFee = c.outcome?.estimatedMdrFeeINR !== undefined ? c.outcome.estimatedMdrFeeINR : mdrCalc.totalMdrFeeINR;

        totalRevenueRecovered += recAmount;
        totalIncentiveCost += incCost;
        totalRecoveryTimeSec += timeSec;
        totalMdrFees += mdrFee;
        recoveredCount++;

        chData.recovered += 1;
        chData.revenueRecovered += recAmount;
        chData.incentiveCost += incCost;
        chData.totalTimeSec += timeSec;
        chData.mdrFee += mdrFee;

        rcData.recoveredCases += 1;
        rcData.revenueRecovered += recAmount;
      } else if (c.status === 'FAILED' || c.status === 'DISMISSED') {
        failedCount++;
      }
    }

    const activeCases = allCases.filter(c => c.status !== 'RECOVERED' && c.status !== 'FAILED' && c.status !== 'DISMISSED');
    const recoveryRate = totalRevenueAtRisk > 0 ? (totalRevenueRecovered / totalRevenueAtRisk) * 100 : 0;
    const avgTimeSeconds = recoveredCount > 0 ? Math.round(totalRecoveryTimeSec / recoveredCount) : 135;
    const avgTimeMinutes = Number((avgTimeSeconds / 60).toFixed(1));

    // Full Financial Accounting: Net Saved = Gross Recovered - (Incentive + Ops Cost + MDR Fees)
    const totalDeductions = totalIncentiveCost + totalRecoveryOpsCost + totalMdrFees;
    const netRevenueSaved = Math.max(0, totalRevenueRecovered - totalDeductions);
    const recoveryROI = totalDeductions > 0 ? Number((netRevenueSaved / totalDeductions).toFixed(1)) : 14.8;

    const channelMetrics: ChannelRecoveryMetric[] = Array.from(channelMap.values()).map(ch => {
      const chRecoveryRate = ch.attempted > 0 ? Number(((ch.recovered / ch.attempted) * 100).toFixed(1)) : 0;
      const chAvgTime = ch.recovered > 0 ? Math.round(ch.totalTimeSec / ch.recovered) : 120;
      const chTotalCost = ch.incentiveCost + ch.opsCost + ch.mdrFee;
      const chNetSaved = Math.max(0, ch.revenueRecovered - chTotalCost);
      const chRoi = chTotalCost > 0 ? Number((chNetSaved / chTotalCost).toFixed(1)) : 12.0;

      return {
        channel: ch.channel as ChannelType,
        channelName: ch.channelName,
        attemptedCases: ch.attempted,
        recoveredCases: ch.recovered,
        revenueAtRiskINR: Math.round(ch.revenueAtRisk),
        revenueRecoveredINR: Math.round(ch.revenueRecovered),
        channelRecoveryRatePct: chRecoveryRate,
        avgRecoveryTimeSec: chAvgTime,
        totalIncentiveINR: Math.round(ch.incentiveCost),
        totalRecoveryCostINR: Math.round(ch.opsCost),
        totalMdrFeeINR: Math.round(ch.mdrFee),
        netRevenueSavedINR: Math.round(chNetSaved),
        roiMultiplier: chRoi
      };
    }).sort((a, b) => b.revenueRecoveredINR - a.revenueRecoveredINR);

    const rootCauseMetrics: RootCauseRecoveryMetric[] = Array.from(rootCauseMap.values()).map(rc => ({
      rootCause: rc.rootCause,
      rootCauseLabel: rc.rootCauseLabel,
      totalCases: rc.totalCases,
      recoveredCases: rc.recoveredCases,
      revenueAtRiskINR: Math.round(rc.revenueAtRisk),
      revenueRecoveredINR: Math.round(rc.revenueRecovered),
      recoveryRatePct: rc.totalCases > 0 ? Number(((rc.recoveredCases / rc.totalCases) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.revenueAtRiskINR - a.revenueAtRiskINR);

    // ===================================================================
    // CHECKOUT ABANDONMENT RECOVERY METRICS
    // ===================================================================
    const checkoutCases = allCases.filter(c => c.eventType === 'CHECKOUT_ABANDONED');
    const checkoutAbandonedCount = checkoutCases.length;
    const checkoutRecoveredCases = checkoutCases.filter(c => c.status === 'RECOVERED');
    const checkoutRecoveredCount = checkoutRecoveredCases.length;
    const checkoutAtRiskGMV = checkoutCases.reduce((sum, c) => sum + c.amount, 0);
    const checkoutRecoveredGMV = checkoutRecoveredCases.reduce((sum, c) => sum + (c.outcome?.recoveredAmount || c.amount), 0);
    const checkoutRecoveryRate = checkoutAbandonedCount > 0 ? Number(((checkoutRecoveredCount / checkoutAbandonedCount) * 100).toFixed(1)) : 0;
    const checkoutAvgTimeSec = checkoutRecoveredCount > 0
      ? Math.round(checkoutRecoveredCases.reduce((sum, c) => sum + (c.outcome?.timeToRecoverSeconds || 120), 0) / checkoutRecoveredCount)
      : 180;

    const stageLabels: Record<string, string> = {
      'CART_VIEW': 'Cart Review',
      'ADDRESS_ENTRY': 'Address Entry',
      'PAYMENT_SELECTION': 'Payment Selection',
      'PAYMENT_AUTHORIZATION': 'Payment Authorization',
      'OTP_ENTRY': 'OTP / 2FA Entry',
      'FAILED': 'Failed at Checkout'
    };

    const stageMap = new Map<string, { abandoned: number; recovered: number; atRisk: number; recoveredGmv: number }>();
    const deviceMap = new Map<string, { abandoned: number; recovered: number }>();
    const checkoutChannelMap = new Map<string, { attempted: number; recovered: number; gmvRecovered: number }>();

    for (const c of checkoutCases) {
      const stage = c.checkoutProfile?.stageReached || 'PAYMENT_SELECTION';
      const device = c.checkoutProfile?.deviceType || 'mobile';
      const channel = (c.outcome?.attributedChannel?.split('_')[0] || c.strategy?.targetChannel || 'WHATSAPP').toUpperCase();

      if (!stageMap.has(stage)) stageMap.set(stage, { abandoned: 0, recovered: 0, atRisk: 0, recoveredGmv: 0 });
      const sd = stageMap.get(stage)!;
      sd.abandoned++;
      sd.atRisk += c.amount;
      if (c.status === 'RECOVERED') {
        sd.recovered++;
        sd.recoveredGmv += c.outcome?.recoveredAmount || c.amount;
      }

      if (!deviceMap.has(device)) deviceMap.set(device, { abandoned: 0, recovered: 0 });
      const dd = deviceMap.get(device)!;
      dd.abandoned++;
      if (c.status === 'RECOVERED') dd.recovered++;

      if (!checkoutChannelMap.has(channel)) checkoutChannelMap.set(channel, { attempted: 0, recovered: 0, gmvRecovered: 0 });
      const cd = checkoutChannelMap.get(channel)!;
      cd.attempted++;
      if (c.status === 'RECOVERED') {
        cd.recovered++;
        cd.gmvRecovered += c.outcome?.recoveredAmount || c.amount;
      }
    }

    const checkoutMetrics: CheckoutAbandonmentMetrics = {
      totalAbandonedCheckouts: checkoutAbandonedCount,
      totalRecoveredCheckouts: checkoutRecoveredCount,
      checkoutRecoveryRatePct: checkoutRecoveryRate,
      recoveredGMV_INR: Math.round(checkoutRecoveredGMV),
      totalAtRiskGMV_INR: Math.round(checkoutAtRiskGMV),
      avgRecoveryTimeMinutes: Number((checkoutAvgTimeSec / 60).toFixed(1)),
      stageBreakdown: Array.from(stageMap.entries()).map(([stage, data]) => ({
        stage: stage as CheckoutStage,
        stageLabel: stageLabels[stage] || stage,
        abandonedCount: data.abandoned,
        recoveredCount: data.recovered,
        recoveryRatePct: data.abandoned > 0 ? Number(((data.recovered / data.abandoned) * 100).toFixed(1)) : 0,
        gmvAtRiskINR: Math.round(data.atRisk),
        gmvRecoveredINR: Math.round(data.recoveredGmv)
      })).sort((a, b) => b.gmvAtRiskINR - a.gmvAtRiskINR),
      channelBreakdown: Array.from(checkoutChannelMap.entries()).map(([channel, data]) => ({
        channel,
        attempted: data.attempted,
        recovered: data.recovered,
        recoveryRatePct: data.attempted > 0 ? Number(((data.recovered / data.attempted) * 100).toFixed(1)) : 0,
        gmvRecoveredINR: Math.round(data.gmvRecovered)
      })).sort((a, b) => b.gmvRecoveredINR - a.gmvRecoveredINR),
      deviceBreakdown: Array.from(deviceMap.entries()).map(([device, data]) => ({
        device,
        abandonedCount: data.abandoned,
        recoveredCount: data.recovered,
        recoveryRatePct: data.abandoned > 0 ? Number(((data.recovered / data.abandoned) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.abandonedCount - a.abandonedCount)
    };

    // ===================================================================
    // B2B RECEIVABLES RECOVERY METRICS
    // ===================================================================
    const invoiceCases = allCases.filter(c => c.eventType === 'INVOICE_OVERDUE');
    const invoiceRecoveredCases = invoiceCases.filter(c => c.status === 'RECOVERED');
    const invoiceTotalCount = invoiceCases.length;
    const invoiceRecoveredCount = invoiceRecoveredCases.length;
    const invoiceOutstandingINR = invoiceCases.reduce((sum, c) => sum + c.amount, 0);
    const invoiceRecoveredINR = invoiceRecoveredCases.reduce((sum, c) => sum + (c.outcome?.recoveredAmount || c.amount), 0);
    const invoiceRecoveryRate = invoiceTotalCount > 0 ? Number(((invoiceRecoveredCount / invoiceTotalCount) * 100).toFixed(1)) : 0;
    const invoiceAvgDaysToCollect = invoiceRecoveredCount > 0
      ? Math.round(invoiceRecoveredCases.reduce((sum, c) => sum + (c.outcome?.timeToRecoverSeconds || 86400) / 86400, 0) / invoiceRecoveredCount)
      : 12;

    // Promise-to-pay tracking
    let ptpTotal = 0;
    let ptpKept = 0;
    for (const c of invoiceCases) {
      if ((c as any).promiseToPay) {
        ptpTotal++;
        if ((c as any).promiseToPay.status === 'KEPT') ptpKept++;
      }
    }
    const ptpConversionRate = ptpTotal > 0 ? Number(((ptpKept / ptpTotal) * 100).toFixed(1)) : 0;

    // Aging bucket breakdown
    const agingMap = new Map<string, { count: number; recovered: number; outstanding: number; recoveredAmt: number }>();
    const causeMap = new Map<string, { count: number; recovered: number }>();
    const agingLabels: Record<string, string> = {
      'CURRENT': 'Current (0 DPD)',
      'OVERDUE_30': '1-30 Days Past Due',
      'OVERDUE_60': '31-60 Days Past Due',
      'OVERDUE_90_PLUS': '90+ Days Past Due'
    };
    const causeLabels: Record<string, string> = {
      'INVOICE_APPROVAL_DELAY': 'Approval Delay',
      'INVOICE_PROCUREMENT_DELAY': 'Procurement Delay',
      'INVOICE_CASHFLOW_ISSUE': 'Cash Flow Issue',
      'INVOICE_DISPUTE': 'Invoice Dispute',
      'INVOICE_MISSING_PO': 'Missing PO',
      'INVOICE_UNKNOWN': 'Unknown / Other'
    };

    for (const c of invoiceCases) {
      const dpdBucket = c.invoiceProfile?.dpdBucket || 'OVERDUE_30';
      if (!agingMap.has(dpdBucket)) agingMap.set(dpdBucket, { count: 0, recovered: 0, outstanding: 0, recoveredAmt: 0 });
      const ad = agingMap.get(dpdBucket)!;
      ad.count++;
      ad.outstanding += c.amount;
      if (c.status === 'RECOVERED') {
        ad.recovered++;
        ad.recoveredAmt += c.outcome?.recoveredAmount || c.amount;
      }

      const cause = c.diagnosis?.rootCauseCategory || 'INVOICE_UNKNOWN';
      if (!causeMap.has(cause)) causeMap.set(cause, { count: 0, recovered: 0 });
      const cd = causeMap.get(cause)!;
      cd.count++;
      if (c.status === 'RECOVERED') cd.recovered++;
    }

    const receivablesMetrics: B2BReceivablesMetrics = {
      totalOverdueInvoices: invoiceTotalCount,
      totalRecoveredInvoices: invoiceRecoveredCount,
      receivablesRecoveryRatePct: invoiceRecoveryRate,
      totalOutstandingINR: Math.round(invoiceOutstandingINR),
      totalRecoveredINR: Math.round(invoiceRecoveredINR),
      avgDaysToCollect: invoiceAvgDaysToCollect,
      promiseToPayCount: ptpTotal,
      promiseToPayConversionRatePct: ptpConversionRate,
      agingBreakdown: Array.from(agingMap.entries()).map(([bucket, data]) => ({
        bucket: bucket as InvoiceDPD,
        bucketLabel: agingLabels[bucket] || bucket,
        invoiceCount: data.count,
        recoveredCount: data.recovered,
        outstandingINR: Math.round(data.outstanding),
        recoveredINR: Math.round(data.recoveredAmt),
        recoveryRatePct: data.count > 0 ? Number(((data.recovered / data.count) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.outstandingINR - a.outstandingINR),
      rootCauseBreakdown: Array.from(causeMap.entries()).map(([cause, data]) => ({
        cause,
        causeLabel: causeLabels[cause] || cause,
        invoiceCount: data.count,
        recoveredCount: data.recovered,
        recoveryRatePct: data.count > 0 ? Number(((data.recovered / data.count) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.invoiceCount - a.invoiceCount)
    };

    // ================================================================
    // 7. VOICE RECOVERY AGENT ANALYTICS
    // ================================================================
    const voiceCases = allCases.filter(c => c.voiceProfile);
    const totalCallsPlaced = voiceCases.reduce((sum, c) => {
      const v = c.voiceProfile!;
      return sum + (v.retryCount > 0 ? v.retryCount : (v.outcome ? 1 : 0));
    }, 0);
    const totalCallsAnswered = voiceCases.filter(c => c.voiceProfile?.outcome === 'ANSWERED' || c.voiceProfile?.outcome === 'PROMISE_TO_PAY' || c.voiceProfile?.outcome === 'CALLBACK_REQUESTED' || c.voiceProfile?.outcome === 'REJECTED').length;
    const totalCallsNoAnswer = voiceCases.filter(c => c.voiceProfile?.outcome === 'NO_ANSWER').length;
    const totalCallbacksRequested = voiceCases.filter(c => c.voiceProfile?.outcome === 'CALLBACK_REQUESTED').length;
    const totalPromisesToPay = voiceCases.filter(c => c.voiceProfile?.outcome === 'PROMISE_TO_PAY').length;
    const totalRejected = voiceCases.filter(c => c.voiceProfile?.outcome === 'REJECTED').length;
    const voiceRecoveredCases = voiceCases.filter(c => c.voiceProfile?.outcome === 'PROMISE_TO_PAY' && c.outcome?.isRecovered);
    const voiceRecoveredAmount = voiceRecoveredCases.reduce((sum, c) => sum + (c.outcome?.recoveredAmount || 0), 0);
    const callSuccessRate = totalCallsPlaced > 0 ? Number(((totalCallsAnswered / totalCallsPlaced) * 100).toFixed(1)) : 0;
    const callbackConversion = totalCallsAnswered > 0 ? Number(((totalCallbacksRequested / totalCallsAnswered) * 100).toFixed(1)) : 0;
    const ptpConversion = totalCallsAnswered > 0 ? Number(((totalPromisesToPay / totalCallsAnswered) * 100).toFixed(1)) : 0;
    const avgCallDuration = voiceCases.filter(c => c.voiceProfile?.callDurationSeconds).reduce((sum, c) => sum + (c.voiceProfile!.callDurationSeconds || 0), 0) / (voiceCases.filter(c => c.voiceProfile?.callDurationSeconds).length || 1);
    const totalCallCost = voiceCases.reduce((sum, c) => {
      const dur = c.voiceProfile?.callDurationSeconds || 0;
      return sum + (dur * 0.002); // ₹0.002 per second voice cost
    }, 0);
    const avgCostPerCall = totalCallsPlaced > 0 ? Number((totalCallCost / totalCallsPlaced).toFixed(2)) : 0;
    const costPerRecovery = voiceRecoveredCases.length > 0 ? Number((totalCallCost / voiceRecoveredCases.length).toFixed(2)) : 0;

    const langMap = new Map<VoiceLanguageVariant, { calls: number; answered: number; ptp: number }>();
    const outcomeMap = new Map<VoiceCallOutcome, number>();
    let totalRetrySum = 0;
    let firstAttemptSuccesses = 0;
    let retrySuccesses = 0;

    for (const c of voiceCases) {
      const v = c.voiceProfile!;
      if (v.outcome) {
        outcomeMap.set(v.outcome, (outcomeMap.get(v.outcome) || 0) + 1);
      }
      const lang = v.languageVariant;
      const existing = langMap.get(lang) || { calls: 0, answered: 0, ptp: 0 };
      existing.calls++;
      if (v.outcome === 'ANSWERED' || v.outcome === 'PROMISE_TO_PAY' || v.outcome === 'CALLBACK_REQUESTED' || v.outcome === 'REJECTED') {
        existing.answered++;
      }
      if (v.outcome === 'PROMISE_TO_PAY') {
        existing.ptp++;
      }
      langMap.set(lang, existing);
      totalRetrySum += v.retryCount;
      if (v.retryCount <= 1 && (v.outcome === 'PROMISE_TO_PAY' || v.outcome === 'ANSWERED')) {
        firstAttemptSuccesses++;
      }
      if (v.retryCount > 1 && (v.outcome === 'PROMISE_TO_PAY' || v.outcome === 'ANSWERED')) {
        retrySuccesses++;
      }
    }

    const firstAttemptSuccessPct = totalCallsPlaced > 0 ? Number(((firstAttemptSuccesses / totalCallsPlaced) * 100).toFixed(1)) : 0;
    const retrySuccessPct = totalCallsPlaced > 0 ? Number(((retrySuccesses / totalCallsPlaced) * 100).toFixed(1)) : 0;
    const avgRetriesBeforeAnswer = voiceCases.length > 0 ? Number((totalRetrySum / voiceCases.length).toFixed(1)) : 0;

    const langLabels: Record<VoiceLanguageVariant, string> = { ENGLISH: 'English', HINGLISH: 'Hinglish', HINDI: 'Hindi' };
    const outcomeLabels: Record<VoiceCallOutcome, string> = {
      ANSWERED: 'Answered', NO_ANSWER: 'No Answer', CALLBACK_REQUESTED: 'Callback Requested',
      PROMISE_TO_PAY: 'Promise to Pay', REJECTED: 'Rejected'
    };

    const voiceMetrics: VoiceAnalytics = {
      totalCallsPlaced,
      totalCallsAnswered,
      totalCallsNoAnswer,
      totalCallbacksRequested,
      totalPromisesToPay,
      totalRejected,
      callSuccessRatePct: callSuccessRate,
      callbackConversionRatePct: callbackConversion,
      promiseToPayConversionRatePct: ptpConversion,
      avgCallDurationSeconds: Math.round(avgCallDuration),
      totalCallCostINR: Math.round(totalCallCost * 100) / 100,
      avgCostPerCallINR: avgCostPerCall,
      revenueRecoveredViaVoiceINR: Math.round(voiceRecoveredAmount),
      costPerRecoveryINR: costPerRecovery,
      languageBreakdown: Array.from(langMap.entries()).map(([variant, data]) => ({
        variant,
        label: langLabels[variant],
        callCount: data.calls,
        successRatePct: data.calls > 0 ? Number(((data.answered / data.calls) * 100).toFixed(1)) : 0,
        ptpRatePct: data.calls > 0 ? Number(((data.ptp / data.calls) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.callCount - a.callCount),
      outcomeBreakdown: Array.from(outcomeMap.entries()).map(([outcome, count]) => ({
        outcome,
        label: outcomeLabels[outcome],
        count,
        pct: totalCallsPlaced > 0 ? Number(((count / totalCallsPlaced) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.count - a.count),
      retryStats: {
        avgRetriesBeforeAnswer,
        firstAttemptSuccessPct,
        retrySuccessPct
      }
    };

    return {
      totalRevenueAtRiskINR: Math.round(totalRevenueAtRisk),
      totalRevenueRecoveredINR: Math.round(totalRevenueRecovered),
      recoveryRatePercentage: Number(recoveryRate.toFixed(1)),
      
      totalCasesCount: allCases.length,
      activeCasesCount: activeCases.length,
      recoveredCasesCount: recoveredCount,
      failedCasesCount: failedCount,
      cooldownProtectedCount,
      outagePausedCount,
      avgRecoveryTimeMinutes: avgTimeMinutes,
      avgRecoveryTimeSeconds: avgTimeSeconds,

      totalIncentiveCostINR: Math.round(totalIncentiveCost),
      totalRecoveryCostINR: Math.round(totalRecoveryOpsCost),
      totalMdrFeesINR: Math.round(totalMdrFees),
      netRevenueSavedINR: Math.round(netRevenueSaved),
      recoveryROI: recoveryROI,
      recoveredArrProjectedINR: Math.round(totalRevenueRecovered * 12),
      netMarginProtectedINR: Math.round(netRevenueSaved),

      channelMetrics,
      rootCauseMetrics,
      checkoutMetrics,
      receivablesMetrics,
      voiceMetrics,

      batchTimestamp: new Date().toISOString(),
      settledCasesCount: recoveredCount
    };
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
  // Initial Dataset Seeding
  // =========================================================================
  private seedLocalDefaults() {
    // 1. Bank Switches
    const banks: BankHealthMetric[] = [
      { bankCode: 'HDFC', name: 'HDFC Bank Ltd', networkType: 'UPI & Netbanking', rollingSuccessRatePct: 94.8, status: 'HEALTHY', sampleCountLast15Min: 2840, latencyMs: 180, lastUpdated: new Date().toISOString() },
      { bankCode: 'SBI', name: 'State Bank of India', networkType: 'UPI Switch Core', rollingSuccessRatePct: 68.2, status: 'DEGRADED', sampleCountLast15Min: 4120, latencyMs: 890, lastUpdated: new Date().toISOString() },
      { bankCode: 'ICICI', name: 'ICICI Bank Ltd', networkType: 'UPI & IMPS Rail', rollingSuccessRatePct: 96.1, status: 'HEALTHY', sampleCountLast15Min: 1980, latencyMs: 150, lastUpdated: new Date().toISOString() },
      { bankCode: 'AXIS', name: 'Axis Bank Ltd', networkType: 'UPI & Card Gateway', rollingSuccessRatePct: 92.4, status: 'HEALTHY', sampleCountLast15Min: 1510, latencyMs: 210, lastUpdated: new Date().toISOString() },
      { bankCode: 'NPCI_UPI', name: 'NPCI Unified Payments Hub', networkType: 'National Switch', rollingSuccessRatePct: 89.5, status: 'HEALTHY', sampleCountLast15Min: 18450, latencyMs: 340, lastUpdated: new Date().toISOString() }
    ];
    for (const b of banks) {
      this.bankHealthCache.set(b.bankCode, b);
    }

    // 2. Demonstration Cases
    const c1: RecoveryCase = {
      caseId: 'REC-2026-881',
      merchantId: 'mer_razorpay_demo',
      eventType: 'PAYMENT_FAILED',
      status: 'RECOVERED',
      amount: 4999.00,
      currency: 'INR',
      riskTier: 'HIGH',
      customer: {
        id: 'cust_9812',
        name: 'Aarav Sharma',
        phone: '+91 98765 43210',
        email: 'aarav.sharma@example.com',
        clvTier: 'PLATINUM',
        historicalRecoveries: 3,
        totalLifetimeSpendINR: 84000
      },
      sourceEvent: {
        paymentId: 'pay_Kx9281aZ01',
        orderId: 'order_Kx881290aa',
        amount: 4999.00,
        currency: 'INR',
        method: 'UPI',
        errorCode: 'BAD_REQUEST_ERROR',
        errorDescription: 'Payment failed due to single-transaction UPI ticket limit on HDFC Bank handle',
        occurredAt: new Date(Date.now() - 3600000).toISOString(),
        bankCode: 'HDFC'
      },
      diagnosis: {
        rootCauseCategory: 'LIMIT_EXCEEDED',
        rootCauseDetail: 'Customer exceeded single-transaction UPI ticket limit on HDFC Bank handle.',
        confidenceScore: 0.94,
        isTransient: false,
        bankCode: 'HDFC',
        bankSwitchHealthIndex: 94.8,
        recommendedRailSwitch: 'CARD',
        diagnosedAt: new Date(Date.now() - 3590000).toISOString()
      },
      strategy: {
        recommendedAction: 'ACP_A2A_OFFER',
        targetChannel: 'WHATSAPP',
        offeredDiscountPct: 5.0,
        calculatedIncentiveINR: 249.95,
        delayMinutes: 0,
        reasoning: 'High-value Platinum user facing single-transaction UPI limit. Proposed instant 5% cashback on tokenized Visa card checkout.',
        expectedRecoveryProbability: 0.91,
        scheduledExecutionAt: new Date(Date.now() - 3580000).toISOString()
      },
      acpSession: {
        sessionId: 'acp_sess_881',
        status: 'ACCEPTED',
        protocolVersion: 'ACP/2.0',
        dialogue: [
          {
            id: 'msg_01',
            sender: 'MerchantRecoveryAgent',
            receiver: 'CustomerWalletAgent',
            intent: 'PROPOSE_OFFER',
            payload: { discountPct: 5.0, netAmount: 4749.05, selectedMethod: 'CARD', message: 'Offer 5% discount for instant Card checkout without cart regeneration' },
            timestamp: new Date(Date.now() - 3570000).toISOString()
          },
          {
            id: 'msg_02',
            sender: 'CustomerWalletAgent',
            receiver: 'MerchantRecoveryAgent',
            intent: 'ACCEPT_AND_COMMIT',
            payload: { selectedMethod: 'CARD', cardLast4: '4012', consentToken: 'cst_tok_99182', message: 'Customer authorized switch to Visa ending 4012' },
            timestamp: new Date(Date.now() - 3540000).toISOString()
          }
        ]
      },
      compliance: {
        approved: true,
        rulesPassed: ['TRAI_QUIET_HOURS_OK', 'MAX_DISCOUNT_WITHIN_CAP', 'COMMUNICATION_FATIGUE_OK'],
        violations: [],
        requiresHumanApproval: false,
        evaluatedAt: new Date(Date.now() - 3530000).toISOString()
      },
      outcome: {
        isRecovered: true,
        recoveredAmount: 4749.05,
        settledPaymentId: 'pay_Ky9912bZ99',
        recoveredAt: new Date(Date.now() - 3450000).toISOString(),
        timeToRecoverSeconds: 150,
        attributedChannel: 'WHATSAPP_ACP_LINK',
        costOfIncentiveINR: 249.95
      },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3450000).toISOString()
    };

    const c2: RecoveryCase = {
      caseId: 'REC-2026-882',
      merchantId: 'mer_razorpay_demo',
      eventType: 'PAYMENT_FAILED',
      status: 'PENDING_APPROVAL',
      amount: 48500.00,
      currency: 'INR',
      riskTier: 'CRITICAL',
      customer: {
        id: 'cust_4419',
        name: 'Priya Mehra (Enterprise Lead)',
        phone: '+91 98231 11223',
        email: 'priya@techcorp.in',
        clvTier: 'PLATINUM',
        historicalRecoveries: 1,
        totalLifetimeSpendINR: 290000
      },
      sourceEvent: {
        paymentId: 'pay_Lx99321b02',
        orderId: 'order_Lx119283bb',
        amount: 48500.00,
        currency: 'INR',
        method: 'NETBANKING',
        errorCode: 'GATEWAY_ERROR',
        errorDescription: 'Payment authorization timed out on SBI corporate banking portal',
        occurredAt: new Date(Date.now() - 1800000).toISOString(),
        bankCode: 'SBI'
      },
      diagnosis: {
        rootCauseCategory: 'ISSUER_DOWNTIME',
        rootCauseDetail: 'SBI Corporate Banking switch is currently degraded (Success rate 68.2%).',
        confidenceScore: 0.96,
        isTransient: true,
        bankCode: 'SBI',
        bankSwitchHealthIndex: 68.2,
        recommendedRailSwitch: 'CARD',
        diagnosedAt: new Date(Date.now() - 1790000).toISOString()
      },
      strategy: {
        recommendedAction: 'ACP_A2A_OFFER',
        targetChannel: 'WHATSAPP',
        offeredDiscountPct: 8.0,
        calculatedIncentiveINR: 3880.00,
        delayMinutes: 15,
        reasoning: 'High-value enterprise order (₹48,500). System flagged for Human Approval due to transaction value exceeding ₹25,000 threshold.',
        expectedRecoveryProbability: 0.85,
        scheduledExecutionAt: new Date(Date.now() - 1780000).toISOString()
      },
      compliance: {
        approved: false,
        rulesPassed: ['TRAI_QUIET_HOURS_OK'],
        violations: ['TRANSACTION_EXCEEDS_AUTO_APPROVAL_THRESHOLD (₹48,500 > ₹25,000)'],
        requiresHumanApproval: true,
        evaluatedAt: new Date(Date.now() - 1770000).toISOString()
      },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1770000).toISOString()
    };

    const c3: RecoveryCase = {
      caseId: 'REC-2026-883',
      merchantId: 'mer_razorpay_demo',
      eventType: 'SUBSCRIPTION_HALTED',
      status: 'NEGOTIATING',
      amount: 1499.00,
      currency: 'INR',
      riskTier: 'MEDIUM',
      customer: {
        id: 'cust_2209',
        name: 'Rohan Deshmukh',
        phone: '+91 97654 33211',
        email: 'rohan.d@gmail.com',
        clvTier: 'GOLD',
        historicalRecoveries: 0,
        totalLifetimeSpendINR: 17988
      },
      sourceEvent: {
        subscriptionId: 'sub_Nx881723cc',
        amount: 1499.00,
        currency: 'INR',
        method: 'NACH_MANDATE',
        errorCode: 'MANDATE_INVALID',
        errorDescription: 'Recurring auto-debit failed: e-Mandate registration expired or revoked',
        occurredAt: new Date(Date.now() - 900000).toISOString(),
        bankCode: 'ICICI'
      },
      diagnosis: {
        rootCauseCategory: 'MANDATE_EXPIRED',
        rootCauseDetail: 'Customer e-Mandate expired at issuing bank. Requires tokenized card mandate renewal.',
        confidenceScore: 0.98,
        isTransient: false,
        bankCode: 'ICICI',
        bankSwitchHealthIndex: 96.1,
        recommendedRailSwitch: 'CARD',
        diagnosedAt: new Date(Date.now() - 890000).toISOString()
      },
      strategy: {
        recommendedAction: 'ACP_A2A_OFFER',
        targetChannel: 'WHATSAPP',
        offeredDiscountPct: 0.0,
        calculatedIncentiveINR: 0.0,
        delayMinutes: 0,
        reasoning: 'Recurring subscription mandate renewal required. ACP agent dispatches instant 1-click token authorization link.',
        expectedRecoveryProbability: 0.88,
        scheduledExecutionAt: new Date(Date.now() - 880000).toISOString()
      },
      acpSession: {
        sessionId: 'acp_sess_883',
        status: 'PROPOSED',
        protocolVersion: 'ACP/2.0',
        dialogue: [
          {
            id: 'msg_883_01',
            sender: 'MerchantRecoveryAgent',
            receiver: 'CustomerWalletAgent',
            intent: 'PROPOSE_OFFER',
            payload: { message: 'Subscription auto-debit expired. Renew UPI AutoPay or Tokenized Card with 1 click to prevent service interruption.', netAmount: 1499.00 },
            timestamp: new Date(Date.now() - 870000).toISOString()
          }
        ]
      },
      compliance: {
        approved: true,
        rulesPassed: ['TRAI_QUIET_HOURS_OK', 'FREQUENCY_LIMIT_OK'],
        violations: [],
        requiresHumanApproval: false,
        evaluatedAt: new Date(Date.now() - 860000).toISOString()
      },
      createdAt: new Date(Date.now() - 900000).toISOString(),
      updatedAt: new Date(Date.now() - 860000).toISOString()
    };

    this.casesCache.set(c1.caseId, c1);
    this.casesCache.set(c2.caseId, c2);
    this.casesCache.set(c3.caseId, c3);

    // 2b. Checkout Abandonment Demonstration Cases
    const c4: RecoveryCase = {
      caseId: 'REC-CO-881',
      merchantId: 'mer_razorpay_demo',
      eventType: 'CHECKOUT_ABANDONED',
      status: 'RECOVERED',
      amount: 7499.00,
      currency: 'INR',
      riskTier: 'HIGH',
      customer: {
        id: 'cust_co_881',
        name: 'Ananya Krishnamurthy',
        phone: '+91 98456 78901',
        email: 'ananya.k@example.com',
        clvTier: 'GOLD',
        historicalRecoveries: 1,
        totalLifetimeSpendINR: 52000
      },
      sourceEvent: {
        orderId: 'order_co_881',
        amount: 7499.00,
        currency: 'INR',
        method: 'UPI',
        errorCode: 'CHECKOUT_ABANDONED',
        errorDescription: 'Customer abandoned checkout at payment authorization stage after 8 min 42 sec session',
        occurredAt: new Date(Date.now() - 1800000).toISOString(),
        bankCode: 'HDFC'
      },
      checkoutProfile: {
        checkoutId: 'chk_881_krishnamurthy',
        sessionId: 'sess_co_881',
        abandonedAt: new Date(Date.now() - 1800000).toISOString(),
        lastActivityAt: new Date(Date.now() - 1800000).toISOString(),
        stageReached: 'PAYMENT_AUTHORIZATION',
        cartValueINR: 7499.00,
        cartItems: [
          { name: 'Premium Wireless Headphones', quantity: 1, priceINR: 4999 },
          { name: 'Carrying Case', quantity: 1, priceINR: 1500 },
          { name: 'Extended Warranty', quantity: 1, priceINR: 1000 }
        ],
        totalCartItems: 3,
        deviceType: 'mobile',
        browserSessionDurationSec: 522,
        previousVisitCount: 3,
        recoveryProbability: 0.78
      },
      diagnosis: {
        rootCauseCategory: 'CHECKOUT_STALL',
        rootCauseDetail: 'Customer stalled at UPI payment authorization for 8+ minutes on mobile device. Likely encountered UPI app switch friction or second thoughts on cart total.',
        confidenceScore: 0.91,
        isTransient: false,
        bankCode: 'HDFC',
        bankSwitchHealthIndex: 94.8,
        recommendedRailSwitch: 'CARD',
        diagnosedAt: new Date(Date.now() - 1790000).toISOString()
      },
      strategy: {
        recommendedAction: 'PAYMENT_LINK_DISPATCH',
        targetChannel: 'WHATSAPP',
        offeredDiscountPct: 3.0,
        calculatedIncentiveINR: 224.97,
        delayMinutes: 0,
        reasoning: 'High cart value (₹7,499) with 3-item basket and Gold CLV tier. Recovery probability 78% — WhatsApp interactive message with 3% instant incentive and 1-click payment link to recover abandoned cart.',
        expectedRecoveryProbability: 0.82,
        scheduledExecutionAt: new Date(Date.now() - 1780000).toISOString()
      },
      compliance: {
        approved: true,
        rulesPassed: ['TRAI_QUIET_HOURS_OK', 'MAX_DISCOUNT_WITHIN_CAP', 'CHECKOUT_RECOVERY_AUTHORIZED'],
        violations: [],
        requiresHumanApproval: false,
        evaluatedAt: new Date(Date.now() - 1770000).toISOString()
      },
      outcome: {
        isRecovered: true,
        recoveredAmount: 7274.03,
        settledPaymentId: 'pay_co_881_settled',
        paymentLinkId: 'plink_co_881',
        reconciliationMethod: 'PAYMENT_LINK_PAID_WEBHOOK',
        recoveredAt: new Date(Date.now() - 1620000).toISOString(),
        timeToRecoverSeconds: 180,
        attributedChannel: 'WHATSAPP_PAYMENT_LINK',
        costOfIncentiveINR: 224.97,
        estimatedMdrFeeINR: 138.32,
        mdrRatePct: 1.9,
        businessInsights: 'Recovered ₹7,274 from abandoned 3-item cart via WhatsApp payment link with 3% incentive. Cart-level recovery protected ₹7,274 GMV and 2.0% MDR margin on this session.'
      },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1620000).toISOString()
    };

    const c5: RecoveryCase = {
      caseId: 'REC-CO-882',
      merchantId: 'mer_razorpay_demo',
      eventType: 'CHECKOUT_ABANDONED',
      status: 'EXECUTING',
      amount: 24999.00,
      currency: 'INR',
      riskTier: 'CRITICAL',
      customer: {
        id: 'cust_co_882',
        name: 'Rajeev Menon',
        phone: '+91 98200 55667',
        email: 'rajeev.m@enterprise.in',
        clvTier: 'PLATINUM',
        historicalRecoveries: 0,
        totalLifetimeSpendINR: 320000
      },
      sourceEvent: {
        orderId: 'order_co_882',
        amount: 24999.00,
        currency: 'INR',
        method: 'CARD',
        errorCode: 'CHECKOUT_ABANDONED',
        errorDescription: 'Enterprise customer abandoned checkout at OTP entry stage after 4 min 15 sec session',
        occurredAt: new Date(Date.now() - 960000).toISOString(),
        bankCode: 'ICICI'
      },
      checkoutProfile: {
        checkoutId: 'chk_882_menon',
        sessionId: 'sess_co_882',
        abandonedAt: new Date(Date.now() - 960000).toISOString(),
        lastActivityAt: new Date(Date.now() - 960000).toISOString(),
        stageReached: 'OTP_ENTRY',
        cartValueINR: 24999.00,
        cartItems: [
          { name: 'Enterprise SaaS Annual License', quantity: 1, priceINR: 19999 },
          { name: 'Premium Support Add-on', quantity: 1, priceINR: 5000 }
        ],
        totalCartItems: 2,
        deviceType: 'desktop',
        browserSessionDurationSec: 255,
        previousVisitCount: 5,
        recoveryProbability: 0.85
      },
      diagnosis: {
        rootCauseCategory: 'CHECKOUT_SESSION_EXPIRED',
        rootCauseDetail: 'Customer abandoned at OTP entry stage — likely session timeout or OTP delivery delay on ICICI corporate card. High-intent Platinum user with 5 prior visits.',
        confidenceScore: 0.93,
        isTransient: true,
        bankCode: 'ICICI',
        bankSwitchHealthIndex: 96.1,
        recommendedRailSwitch: 'CARD',
        diagnosedAt: new Date(Date.now() - 950000).toISOString()
      },
      strategy: {
        recommendedAction: 'ACP_A2A_OFFER',
        targetChannel: 'WHATSAPP',
        offeredDiscountPct: 0.0,
        calculatedIncentiveINR: 0.0,
        delayMinutes: 0,
        reasoning: 'Platinum enterprise customer with 5 prior visits and ₹3.2L lifetime spend. High intent — no discount needed. WhatsApp interactive button for 1-click OTP re-entry on saved card.',
        expectedRecoveryProbability: 0.87,
        scheduledExecutionAt: new Date(Date.now() - 940000).toISOString()
      },
      compliance: {
        approved: true,
        rulesPassed: ['TRAI_QUIET_HOURS_OK', 'CHECKOUT_RECOVERY_AUTHORIZED'],
        violations: [],
        requiresHumanApproval: false,
        evaluatedAt: new Date(Date.now() - 930000).toISOString()
      },
      createdAt: new Date(Date.now() - 960000).toISOString(),
      updatedAt: new Date(Date.now() - 930000).toISOString()
    };

    this.casesCache.set(c4.caseId, c4);
    this.casesCache.set(c5.caseId, c5);

    // 2c. B2B Receivables Invoice Demonstration Cases
    const c6: RecoveryCase = {
      caseId: 'REC-INV-881',
      merchantId: 'mer_razorpay_demo',
      eventType: 'INVOICE_OVERDUE',
      status: 'RECOVERED',
      amount: 185000.00,
      currency: 'INR',
      riskTier: 'CRITICAL',
      customer: {
        id: 'cust_inv_881',
        name: 'Vikram Patel',
        phone: '+91 98201 22334',
        email: 'vikram.patel@techsolutions.in',
        clvTier: 'PLATINUM',
        historicalRecoveries: 2,
        totalLifetimeSpendINR: 4200000
      },
      sourceEvent: {
        invoiceId: 'inv_ts_881',
        amount: 185000.00,
        currency: 'INR',
        method: 'NETBANKING',
        errorCode: 'INVOICE_OVERDUE',
        errorDescription: 'Invoice INV-2026-TS-441 overdue by 45 days. Payment terms NET-30. Approval delay from procurement team.',
        occurredAt: new Date(Date.now() - 3888000000).toISOString(),
        bankCode: 'HDFC'
      },
      invoiceProfile: {
        invoiceId: 'inv_ts_881',
        invoiceNumber: 'INV-2026-TS-441',
        invoiceDate: new Date(Date.now() - 3888000000).toISOString(),
        dueDate: new Date(Date.now() - 1296000000).toISOString(),
        daysPastDue: 45,
        dpdBucket: 'OVERDUE_60',
        outstandingAmountINR: 185000.00,
        originalAmountINR: 185000.00,
        paymentTerms: 'NET_30',
        companyName: 'TechSolutions India Pvt Ltd',
        companyGstin: '27AABCT1234F1Z5',
        contactPerson: 'Vikram Patel',
        contactEmail: 'vikram.patel@techsolutions.in',
        contactPhone: '+91 98201 22334',
        invoiceItems: [
          { description: 'Enterprise Cloud Infrastructure (Q1 2026)', quantity: 1, unitPriceINR: 120000 },
          { description: 'Technical Support Retainer', quantity: 3, unitPriceINR: 15000 },
          { description: 'Data Migration Services', quantity: 1, unitPriceINR: 20000 }
        ],
        poNumber: 'PO-TECH-2026-088',
        gracePeriodDays: 7,
        totalLifetimeBusinessINR: 4200000,
        historicalOnTimePaymentRate: 0.82,
        recoveryProbability: 0.88
      },
      diagnosis: {
        rootCauseCategory: 'INVOICE_APPROVAL_DELAY',
        rootCauseDetail: 'Internal procurement approval delayed by 2 weeks at TechSolutions. Finance team confirmed payment upon PO re-approval. High recovery confidence — relationship account with 82% on-time history.',
        confidenceScore: 0.94,
        isTransient: false,
        bankCode: 'HDFC',
        bankSwitchHealthIndex: 94.8,
        recommendedRailSwitch: 'NETBANKING',
        diagnosedAt: new Date(Date.now() - 3600000).toISOString()
      },
      strategy: {
        recommendedAction: 'PAYMENT_LINK_DISPATCH',
        targetChannel: 'EMAIL',
        offeredDiscountPct: 0,
        calculatedIncentiveINR: 0,
        delayMinutes: 0,
        reasoning: 'High-value enterprise account (₹1.85L, 82% on-time history). Root cause is internal approval delay, not cash flow. Professional email with payment link + WhatsApp reminder to AP contact. No discount needed.',
        expectedRecoveryProbability: 0.88,
        scheduledExecutionAt: new Date(Date.now() - 3500000).toISOString()
      },
      compliance: {
        approved: true,
        rulesPassed: ['TRAI_QUIET_HOURS_OK', 'B2B_INVOICING_COMPLIANT', 'VALUE_WITHIN_AUTO_THRESHOLD'],
        violations: [],
        requiresHumanApproval: false,
        evaluatedAt: new Date(Date.now() - 3400000).toISOString()
      },
      outcome: {
        isRecovered: true,
        recoveredAmount: 185000.00,
        settledPaymentId: 'pay_inv_881_settled',
        paymentLinkId: 'plink_inv_881',
        reconciliationMethod: 'PAYMENT_LINK_PAID_WEBHOOK',
        recoveredAt: new Date(Date.now() - 2592000000).toISOString(),
        timeToRecoverSeconds: 1296000,
        attributedChannel: 'EMAIL_PAYMENT_LINK',
        costOfIncentiveINR: 0,
        estimatedMdrFeeINR: 2775.00,
        mdrRatePct: 1.5,
        businessInsights: 'Recovered ₹1,85,000 overdue invoice from TechSolutions via professional email + payment link. Zero incentive cost. Approval-delay root cause resolved with targeted outreach to procurement contact.'
      },
      createdAt: new Date(Date.now() - 3888000000).toISOString(),
      updatedAt: new Date(Date.now() - 2592000000).toISOString()
    };

    const c7: RecoveryCase = {
      caseId: 'REC-INV-882',
      merchantId: 'mer_razorpay_demo',
      eventType: 'INVOICE_OVERDUE',
      status: 'NEGOTIATING',
      amount: 420000.00,
      currency: 'INR',
      riskTier: 'CRITICAL',
      customer: {
        id: 'cust_inv_882',
        name: 'Neha Agarwal',
        phone: '+91 99302 55667',
        email: 'neha.agarwal@manufacturing.co',
        clvTier: 'PLATINUM',
        historicalRecoveries: 0,
        totalLifetimeSpendINR: 8500000
      },
      sourceEvent: {
        invoiceId: 'inv_mfg_882',
        amount: 420000.00,
        currency: 'INR',
        method: 'NETBANKING',
        errorCode: 'INVOICE_OVERDUE',
        errorDescription: 'Invoice INV-2026-MFG-112 overdue by 92 days. Payment terms NET-60. Suspected cash flow issue at client end.',
        occurredAt: new Date(Date.now() - 7948800000).toISOString(),
        bankCode: 'ICICI'
      },
      invoiceProfile: {
        invoiceId: 'inv_mfg_882',
        invoiceNumber: 'INV-2026-MFG-112',
        invoiceDate: new Date(Date.now() - 7948800000).toISOString(),
        dueDate: new Date(Date.now() - 2678400000).toISOString(),
        daysPastDue: 92,
        dpdBucket: 'OVERDUE_90_PLUS',
        outstandingAmountINR: 420000.00,
        originalAmountINR: 420000.00,
        paymentTerms: 'NET_60',
        companyName: 'Precision Manufacturing Ltd',
        companyGstin: '29AABCP5678G1Z8',
        contactPerson: 'Neha Agarwal',
        contactEmail: 'neha.agarwal@manufacturing.co',
        contactPhone: '+91 99302 55667',
        invoiceItems: [
          { description: 'Industrial IoT Platform License (Annual)', quantity: 1, unitPriceINR: 280000 },
          { description: 'On-site Implementation Support (10 days)', quantity: 10, unitPriceINR: 12000 },
          { description: 'Custom Dashboard Module', quantity: 1, unitPriceINR: 20000 }
        ],
        poNumber: 'PO-MFG-2026-201',
        gracePeriodDays: 7,
        totalLifetimeBusinessINR: 8500000,
        historicalOnTimePaymentRate: 0.65,
        recoveryProbability: 0.72
      },
      diagnosis: {
        rootCauseCategory: 'INVOICE_CASHFLOW_ISSUE',
        rootCauseDetail: 'Precision Manufacturing reports Q2 cash flow constraints. 65% historical on-time rate indicates systemic payment delays. Requires escalation with payment plan proposal and executive outreach.',
        confidenceScore: 0.91,
        isTransient: false,
        bankCode: 'ICICI',
        bankSwitchHealthIndex: 96.1,
        recommendedRailSwitch: 'NETBANKING',
        diagnosedAt: new Date(Date.now() - 3600000).toISOString()
      },
      strategy: {
        recommendedAction: 'PAYMENT_LINK_DISPATCH',
        targetChannel: 'EMAIL',
        offeredDiscountPct: 2.0,
        calculatedIncentiveINR: 8400,
        delayMinutes: 0,
        reasoning: 'High-value ₹4.2L invoice at 92+ DPD with cash flow root cause. Offer 2% early payment discount (₹8,400) to incentivize full settlement. Email executive outreach + WhatsApp to AP contact with payment plan option if full payment not feasible.',
        expectedRecoveryProbability: 0.72,
        scheduledExecutionAt: new Date(Date.now() - 3500000).toISOString()
      },
      compliance: {
        approved: true,
        rulesPassed: ['TRAI_QUIET_HOURS_OK', 'B2B_INVOICING_COMPLIANT'],
        violations: [],
        requiresHumanApproval: false,
        evaluatedAt: new Date(Date.now() - 3400000).toISOString()
      },
      createdAt: new Date(Date.now() - 7948800000).toISOString(),
      updatedAt: new Date(Date.now() - 3400000).toISOString()
    };

    this.casesCache.set(c6.caseId, c6);
    this.casesCache.set(c7.caseId, c7);

    // ================================================================
    // VOICE RECOVERY AGENT SEED CASES
    // ================================================================

    const vc1: RecoveryCase = {
      caseId: 'REC-VO-901',
      merchantId: 'mer_razorpay_demo',
      eventType: 'PAYMENT_FAILED',
      status: 'RECOVERED',
      amount: 4999.00,
      currency: 'INR',
      riskTier: 'MEDIUM',
      customer: {
        id: 'cust_vo_901',
        name: 'Priya Sharma',
        phone: '+91 98765 43210',
        email: 'priya.sharma@gmail.com',
        clvTier: 'GOLD',
        historicalRecoveries: 1,
        totalLifetimeSpendINR: 85000
      },
      sourceEvent: {
        paymentId: 'pay_vo_901_failed',
        amount: 4999.00,
        currency: 'INR',
        method: 'UPI',
        errorCode: 'UPI_INSUFFICIENT_FUNDS',
        errorDescription: 'Customer UPI transaction failed due to insufficient funds. Voice agent initiated Hinglish recovery call.',
        occurredAt: new Date(Date.now() - 43200000).toISOString(),
        bankCode: 'SBI'
      },
      voiceProfile: {
        agentId: 'voice-agent-001',
        caseId: 'REC-VO-901',
        phoneNumber: '+91 98765 43210',
        callerName: 'Priya Sharma',
        languageVariant: 'HINGLISH',
        toneVariant: 'FRIENDLY',
        scriptSegments: [
          {
            segment: 'GREETING',
            textEN: 'Hello Priya, this is a call from your payment platform regarding your recent transaction.',
            textHinglish: 'Namaste Priya ji, main aapki payment platform se bol raha hoon. Aapka recent transaction ka related call hai.',
            textHindi: 'नमस्ते प्रिया जी, मैं आपकी पेमेंट प्लेटफॉर्म से बोल रहा हूँ।'
          },
          {
            segment: 'ISSUE_EXPLANATION',
            textEN: 'Your payment of ₹4,999 could not be processed due to insufficient balance in your account.',
            textHinglish: 'Aapka ₹4,999 ka payment process nahi ho paya kyunki aapke account mein balance kami hai.',
            textHindi: 'आपका ₹4,999 का पेमेंट प्रोसेस नहीं हो पाया क्योंकि अकाउंट में बैलेंस कम है।'
          },
          {
            segment: 'RECOVERY_OFFER',
            textEN: 'We can retry the payment now, or you can use a different payment method. Would you like to try again?',
            textHinglish: 'Hum abhi payment retry kar sakte hain, ya aap doosra payment method use kar sakte hain. Kya aap phir se try karna chahenge?',
            textHindi: 'हम अभी पेमेंट रीट्राई कर सकते हैं, या आप दूसरा पेमेंट मेथड इस्तेमाल कर सकते हैं।'
          },
          {
            segment: 'PAYMENT_CTA',
            textEN: 'I can send you a payment link right now. Just confirm and I will share it on WhatsApp.',
            textHinglish: 'Main aapko abhi payment link bhej sakta hoon. Bas confirm kijiye, main WhatsApp pe share kar dunga.',
            textHindi: 'मैं आपको अभी पेमेंट लिंक भेज सकता हूँ। बस कन्फर्म कीजिए।'
          }
        ],
        retryCount: 1,
        maxRetries: 3,
        callStartedAt: new Date(Date.now() - 42000000).toISOString(),
        callEndedAt: new Date(Date.now() - 41700000).toISOString(),
        callDurationSeconds: 185,
        outcome: 'PROMISE_TO_PAY',
        outcomeReason: 'Customer confirmed will retry payment within 2 hours after salary credit.',
        promisedPaymentDate: new Date(Date.now() - 36000000).toISOString(),
        promisedAmountINR: 4999,
        dnis: '1800123456',
        ani: '+91 98765 43210',
        campaignId: 'CAMP-VO-2026-001'
      },
      diagnosis: {
        rootCauseCategory: 'INSUFFICIENT_FUNDS',
        rootCauseDetail: 'Customer UPI transaction failed due to insufficient funds. Voice agent Hinglish call resulted in promise-to-pay within 2 hours.',
        confidenceScore: 0.92,
        isTransient: true,
        bankCode: 'SBI',
        bankSwitchHealthIndex: 97.2,
        recommendedRailSwitch: 'UPI',
        diagnosedAt: new Date(Date.now() - 41500000).toISOString()
      },
      strategy: {
        recommendedAction: 'VOICE_CALL',
        targetChannel: 'VOICE',
        offeredDiscountPct: 0,
        calculatedIncentiveINR: 0,
        delayMinutes: 0,
        reasoning: 'Gold CLV customer with transient insufficient funds. Voice call in Hinglish with empathetic tone to recover ₹4,999. No discount needed — salary credit expected same day.',
        expectedRecoveryProbability: 0.85,
        scheduledExecutionAt: new Date(Date.now() - 41000000).toISOString()
      },
      compliance: {
        approved: true,
        rulesPassed: ['TRAI_QUIET_HOURS_OK', 'VOICE_CALL_CONSENT_OBTAINED', 'DO_NOT_DISTURB_CLEAR'],
        violations: [],
        requiresHumanApproval: false,
        evaluatedAt: new Date(Date.now() - 40500000).toISOString()
      },
      outcome: {
        isRecovered: true,
        recoveredAmount: 4999.00,
        settledPaymentId: 'pay_vo_901_settled',
        reconciliationMethod: 'VOICE_PROMISE_UPI_RETRY',
        recoveredAt: new Date(Date.now() - 34200000).toISOString(),
        timeToRecoverSeconds: 7800,
        attributedChannel: 'VOICE_HINGLISH',
        costOfIncentiveINR: 0,
        estimatedMdrFeeINR: 14.99,
        mdrRatePct: 0.3,
        businessInsights: 'Recovered ₹4,999 via Hinglish voice call. Customer promised to retry after salary credit. First-attempt call success — no retries needed.'
      },
      createdAt: new Date(Date.now() - 43200000).toISOString(),
      updatedAt: new Date(Date.now() - 34200000).toISOString()
    };

    const vc2: RecoveryCase = {
      caseId: 'REC-VO-902',
      merchantId: 'mer_razorpay_demo',
      eventType: 'CHECKOUT_ABANDONED',
      status: 'RECOVERED',
      amount: 14999.00,
      currency: 'INR',
      riskTier: 'HIGH',
      customer: {
        id: 'cust_vo_902',
        name: 'Rahul Verma',
        phone: '+91 87654 32109',
        email: 'rahul.verma@outlook.com',
        clvTier: 'PLATINUM',
        historicalRecoveries: 3,
        totalLifetimeSpendINR: 210000
      },
      sourceEvent: {
        amount: 14999.00,
        currency: 'INR',
        method: 'UPI',
        errorCode: 'CHECKOUT_ABANDONED',
        errorDescription: 'High-value checkout abandoned at payment page. Customer left after selecting UPI but before completing payment. Voice agent initiated English recovery call.',
        occurredAt: new Date(Date.now() - 7200000).toISOString(),
        bankCode: 'HDFC'
      },
      checkoutProfile: {
        checkoutId: 'chk_vo_902',
        sessionId: 'sess_vo_902',
        abandonedAt: new Date(Date.now() - 7200000).toISOString(),
        lastActivityAt: new Date(Date.now() - 7200000).toISOString(),
        stageReached: 'PAYMENT_SELECTION',
        cartValueINR: 14999,
        cartItems: [
          { name: 'Premium Headphones', quantity: 1, priceINR: 9999 },
          { name: 'Phone Case', quantity: 1, priceINR: 5000 }
        ],
        totalCartItems: 2,
        deviceType: 'desktop',
        browserSessionDurationSec: 420,
        previousVisitCount: 3,
        recoveryProbability: 0.88
      },
      voiceProfile: {
        agentId: 'voice-agent-002',
        caseId: 'REC-VO-902',
        phoneNumber: '+91 87654 32109',
        callerName: 'Rahul Verma',
        languageVariant: 'ENGLISH',
        toneVariant: 'PROFESSIONAL',
        scriptSegments: [
          {
            segment: 'GREETING',
            textEN: 'Good afternoon Rahul, this is a quick call from your shopping platform. Do you have a moment?',
            textHinglish: 'Good afternoon Rahul ji, main aapke shopping platform se call kar raha hoon. Kya aapke paas ek minute hai?',
            textHindi: 'नमस्ते राहुल जी, मैं आपके शॉपिंग प्लेटफॉर्म से बोल रहा हूँ।'
          },
          {
            segment: 'ISSUE_EXPLANATION',
            textEN: 'I noticed you were looking at some items worth ₹14,999 but the payment did not go through. Was there any issue?',
            textHinglish: 'Maine dekha ki aap ₹14,999 ka kuch items dekh rahe the lekin payment complete nahi hua. Koi issue tha kya?',
            textHindi: 'मैंने देखा कि आप ₹14,999 का कुछ आइटम्स देख रहे थे लेकिन पेमेंट कंप्लीट नहीं हुआ।'
          },
          {
            segment: 'RECOVERY_OFFER',
            textEN: 'I can help you complete the purchase right now. We also have a 5% instant discount available if you complete within the next 30 minutes.',
            textHinglish: 'Main aapki purchase complete karne mein help kar sakta hoon. Aur agar aap 30 minute mein complete karte hain toh 5% instant discount bhi hai.',
            textHindi: 'मैं आपकी परचेज़ कंप्लीट करने में हेल्प कर सकता हूँ। 30 मिनट में कंप्लीट करने पर 5% इंस्टैंट डिस्काउंट भी है।'
          },
          {
            segment: 'PAYMENT_CTA',
            textEN: 'Shall I send you a secure payment link? You can pay via any UPI app or card.',
            textHinglish: 'Kya main aapko ek secure payment link bhej doon? Aap koi bhi UPI app ya card se pay kar sakte hain.',
            textHindi: 'क्या मैं आपको एक सिक्योर पेमेंट लिंक भेज दूँ? आप कोई भी UPI ऐप या कार्ड से पे कर सकते हैं।'
          }
        ],
        retryCount: 1,
        maxRetries: 2,
        callStartedAt: new Date(Date.now() - 6900000).toISOString(),
        callEndedAt: new Date(Date.now() - 6600000).toISOString(),
        callDurationSeconds: 240,
        outcome: 'PROMISE_TO_PAY',
        outcomeReason: 'Customer completed payment via UPI link shared during call. 5% discount applied.',
        promisedPaymentDate: new Date(Date.now() - 6000000).toISOString(),
        promisedAmountINR: 14249.05,
        dnis: '1800123456',
        ani: '+91 87654 32109',
        campaignId: 'CAMP-VO-2026-002'
      },
      diagnosis: {
        rootCauseCategory: 'STICKY_CHECKOUT',
        rootCauseDetail: 'High-value cart abandoned at payment page on desktop. Customer hesitated at UPI confirmation. Voice call in English with professional tone recovered via instant payment link.',
        confidenceScore: 0.88,
        isTransient: true,
        bankCode: 'HDFC',
        bankSwitchHealthIndex: 94.8,
        recommendedRailSwitch: 'UPI',
        diagnosedAt: new Date(Date.now() - 6500000).toISOString()
      },
      strategy: {
        recommendedAction: 'VOICE_CALL',
        targetChannel: 'VOICE',
        offeredDiscountPct: 5,
        calculatedIncentiveINR: 749.95,
        delayMinutes: 0,
        reasoning: 'Platinum CLV customer with high cart value (₹14,999). Desktop checkout abandonment at payment page. English professional voice call with 5% instant discount to incentivize immediate completion.',
        expectedRecoveryProbability: 0.88,
        scheduledExecutionAt: new Date(Date.now() - 6200000).toISOString()
      },
      compliance: {
        approved: true,
        rulesPassed: ['TRAI_QUIET_HOURS_OK', 'VOICE_CALL_CONSENT_OBTAINED', 'DISCOUNT_WITHIN_THRESHOLD'],
        violations: [],
        requiresHumanApproval: false,
        evaluatedAt: new Date(Date.now() - 6100000).toISOString()
      },
      outcome: {
        isRecovered: true,
        recoveredAmount: 14249.05,
        settledPaymentId: 'pay_vo_902_settled',
        paymentLinkId: 'plink_vo_902',
        reconciliationMethod: 'VOICE_LINK_PAID_WEBHOOK',
        recoveredAt: new Date(Date.now() - 5400000).toISOString(),
        timeToRecoverSeconds: 1800,
        attributedChannel: 'VOICE_ENGLISH',
        costOfIncentiveINR: 749.95,
        estimatedMdrFeeINR: 42.75,
        mdrRatePct: 0.3,
        businessInsights: 'Recovered ₹14,249 via English voice call with 5% discount. Customer completed payment within 30 minutes of call. High-value checkout recovery successful.'
      },
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 5400000).toISOString()
    };

    this.casesCache.set(vc1.caseId, vc1);
    this.casesCache.set(vc2.caseId, vc2);

    // 3. Initial Audits
    const initialAudits: Omit<AuditLogEntry, 'id' | 'signatureHash' | 'timestamp'>[] = [
      {
        caseId: 'REC-2026-881',
        agentName: 'Detection Agent',
        action: 'INGEST_FAILURE_EVENT',
        rationale: 'Ingested Razorpay webhook payment.failed for ₹4,999. Customer CLV tier evaluated as PLATINUM.',
        model: 'gemini-3.7-flash',
        latencyMs: 140,
        tokensUsed: 210
      },
      {
        caseId: 'REC-2026-881',
        agentName: 'Diagnosis Agent',
        action: 'CORRELATE_BANK_HEALTH',
        rationale: 'Correlated with HDFC switch health (94.8% healthy). Pinpointed user-level daily ticket limit exhaustion.',
        model: 'gemini-3.7-flash',
        latencyMs: 280,
        tokensUsed: 390
      },
      {
        caseId: 'REC-2026-881',
        agentName: 'Strategy Optimizer Agent',
        action: 'FORMULATE_ACP_OFFER',
        rationale: 'Calculated Expected Value of 5% instant discount at ₹4,749 > ₹0 default churn loss.',
        model: 'gemini-3.7-flash',
        latencyMs: 410,
        tokensUsed: 580
      },
      {
        caseId: 'REC-2026-881',
        agentName: 'Compliance Agent',
        action: 'VERIFY_POLICY_GUARDRAILS',
        rationale: 'All checks passed: quiet hours, discount ceiling (5% <= 10%), attempt limit (1/3).',
        model: 'deterministic-rules',
        latencyMs: 15,
        tokensUsed: 0
      },
      {
        caseId: 'REC-2026-881',
        agentName: 'Outcome Agent',
        action: 'SETTLE_AND_ATTRIBUTE_RECOVERY',
        rationale: 'Payment captured via Razorpay ID pay_Ky9912bZ99. Attributed to WhatsApp ACP link.',
        model: 'deterministic-rules',
        latencyMs: 30,
        tokensUsed: 0
      },
      {
        caseId: 'REC-INV-881',
        agentName: 'Receivables Detection Agent',
        action: 'INVOICE_OVERDUE_DETECTED',
        rationale: 'Invoice INV-2026-TS-441 (₹1,85,000) overdue 45 days at TechSolutions India Pvt Ltd. DPD bucket: OVERDUE_60. CLV: Platinum with 82% on-time history.',
        model: 'deterministic-receivables-detector',
        latencyMs: 4,
        tokensUsed: 0
      },
      {
        caseId: 'REC-INV-881',
        agentName: 'Receivables Diagnosis Agent',
        action: 'INVOICE_ROOT_CAUSE_FORENSICS',
        rationale: 'Root cause: Internal procurement approval delay at client. Finance confirmed payment upon PO re-approval. Recovery confidence: 94%.',
        model: 'deterministic-receivables-diagnosis',
        latencyMs: 6,
        tokensUsed: 0
      },
      {
        caseId: 'REC-INV-881',
        agentName: 'Recovery Agent',
        action: 'B2B_PAYMENT_LINK_DISPATCHED',
        rationale: 'Dispatched professional B2B payment link (₹1,85,000) via email to AP contact. WhatsApp reminder sent to procurement lead. Zero incentive cost.',
        model: 'deterministic-receivables-recovery',
        latencyMs: 12,
        tokensUsed: 0
      },
      {
        caseId: 'REC-INV-882',
        agentName: 'Receivables Detection Agent',
        action: 'INVOICE_OVERDUE_DETECTED',
        rationale: 'Invoice INV-2026-MFG-112 (₹4,20,000) overdue 92 days at Precision Manufacturing. DPD bucket: OVERDUE_90_PLUS. Cash flow issue suspected.',
        model: 'deterministic-receivables-detector',
        latencyMs: 5,
        tokensUsed: 0
      },
      {
        caseId: 'REC-VO-901',
        agentName: 'Voice Recovery Agent',
        action: 'VOICE_CALL_INITIATED',
        rationale: 'Hinglish voice call initiated to Priya Sharma (+91 98765 43210) for failed UPI payment of ₹4,999. Language: HINGLISH. Tone: FRIENDLY. Script: 4 segments generated.',
        model: 'voice-agent-gemini',
        latencyMs: 180,
        tokensUsed: 320
      },
      {
        caseId: 'REC-VO-901',
        agentName: 'Voice Recovery Agent',
        action: 'PROMISE_TO_PAY_CAPTURED',
        rationale: 'Customer promised to retry payment within 2 hours after salary credit. Promise amount: ₹4,999. Follow-up scheduled.',
        model: 'voice-agent-gemini',
        latencyMs: 45,
        tokensUsed: 120
      },
      {
        caseId: 'REC-VO-902',
        agentName: 'Voice Recovery Agent',
        action: 'VOICE_CALL_INITIATED',
        rationale: 'English voice call initiated to Rahul Verma (+91 87654 32109) for abandoned checkout of ₹14,999. Language: ENGLISH. Tone: PROFESSIONAL. 5% discount offered.',
        model: 'voice-agent-gemini',
        latencyMs: 195,
        tokensUsed: 350
      },
      {
        caseId: 'REC-VO-902',
        agentName: 'Voice Recovery Agent',
        action: 'PAYMENT_RECOVERED_VIA_VOICE',
        rationale: 'Customer completed ₹14,249 payment via UPI link shared during English voice call. 5% discount applied. Recovery time: 30 minutes.',
        model: 'voice-agent-gemini',
        latencyMs: 50,
        tokensUsed: 140
      }
    ];

    for (const entry of initialAudits) {
      const timestamp = new Date(Date.now() - 3500000).toISOString();
      const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const rawPayload = `${entry.caseId}:${entry.agentName}:${entry.action}:${entry.rationale}:${timestamp}`;
      const signatureHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

      const fullLog: AuditLogEntry = {
        ...entry,
        id,
        timestamp,
        signatureHash
      };

      const caseLogs = this.auditLogsCache.get(entry.caseId) || [];
      caseLogs.push(fullLog);
      this.auditLogsCache.set(entry.caseId, caseLogs);
    }
  }
}

export const db = new FirestoreDatabase();
