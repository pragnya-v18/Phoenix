/**
 * Pipeline and case locking utilities for RecoverFlow AI
 */

import { RecoveryCase, AuditLogEntry } from '../../src/types/index.js';
import { db } from '../repositories/db.js';

// Per-case pipeline lock to prevent duplicate concurrent executions
const pipelineLocks = new Map<string, Promise<{ updatedCase: RecoveryCase; traces: any[] }>>();

// Per-case mutex for critical sections (human-action vs pipeline coordination).
// The pipeline checks this before starting. The human-action holds it for its
// entire read→modify→persist cycle. This prevents a new pipeline from starting
// between waitForPipeline() returning and the case update completing.
const caseLocks = new Map<string, Promise<void>>();

/**
 * Acquire a per-case mutex. Returns a release function.
 * The caller MUST call release() in a finally block.
 */
export async function acquireCaseLock(caseId: string): Promise<() => void> {
  // Wait for any existing lock on this case
  const existing = caseLocks.get(caseId);
  if (existing) {
    try { await existing; } catch { /* lock holder threw — still safe to proceed */ }
  }
  // Install our lock (resolves when we call release)
  let releaseFn: () => void;
  const lockPromise = new Promise<void>((resolve) => { releaseFn = resolve; });
  caseLocks.set(caseId, lockPromise);
  return () => { caseLocks.delete(caseId); releaseFn!(); };
}

/**
 * Wait for any in-flight pipeline on a case to finish before modifying it.
 * Returns the pipeline result if one was running, or undefined if idle.
 * Used by human-action routes to coordinate with the pipeline.
 */
export async function waitForPipeline(caseId: string): Promise<{ updatedCase: RecoveryCase; traces: any[] } | undefined> {
  const existing = pipelineLocks.get(caseId);
  if (existing) {
    try {
      return await existing;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Get a reference to the pipeline locks map (for internal use by pipeline orchestrator)
 */
export function getPipelineLocks(): Map<string, Promise<{ updatedCase: RecoveryCase; traces: any[] }>> {
  return pipelineLocks;
}

/**
 * Get a reference to the case locks map (for internal use by pipeline orchestrator)
 */
export function getCaseLocks(): Map<string, Promise<void>> {
  return caseLocks;
}
