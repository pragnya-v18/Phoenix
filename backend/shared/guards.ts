/**
 * Status guards and safe persistence utilities for RecoverFlow AI
 */

import { RecoveryCase, AuditLogEntry } from '../../src/types/index.js';
import { db } from '../repositories/db.js';

// Terminal statuses — pipeline must not reprocess cases in these states
const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['RECOVERED', 'DISMISSED']);

/**
 * Check if a case status is terminal (should not be reprocessed)
 */
export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Get the set of terminal statuses (for external use)
 */
export function getTerminalStatuses(): ReadonlySet<string> {
  return TERMINAL_STATUSES;
}

/**
 * Safe DB persistence wrapper — never throws, always logs
 */
export async function safePersistCase(recoveryCase: RecoveryCase): Promise<boolean> {
  try {
    await db.upsertCase(recoveryCase);
    return true;
  } catch (err) {
    console.error(`[AgentSupervisor] Failed to persist case ${recoveryCase.caseId}:`, err);
    return false;
  }
}

/**
 * Safe audit log wrapper — never throws, always logs
 */
export async function safeAuditLog(entry: Omit<AuditLogEntry, 'id' | 'signatureHash' | 'timestamp'>): Promise<void> {
  try {
    await db.addAuditLog(entry);
  } catch (err) {
    console.warn(`[AgentSupervisor] Failed to write audit log for case ${entry.caseId}:`, err);
  }
}

/**
 * Get the set of active (non-terminal) statuses
 */
export function getActiveStatuses(): string[] {
  return ['DETECTED', 'DIAGNOSING', 'NEGOTIATING', 'PENDING_APPROVAL', 'EXECUTING', 'COOLDOWN_PROTECTED', 'OUTAGE_PAUSED', 'FOLLOWING_UP'];
}
