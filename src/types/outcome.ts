/**
 * Outcome and audit types for RecoverFlow AI
 */

export interface OutcomeRecord {
  isRecovered: boolean;
  recoveredAmount: number;
  settledPaymentId?: string;
  paymentLinkId?: string;
  reconciliationMethod?: 'PAYMENT_LINK_PAID_WEBHOOK' | 'PAYMENT_CAPTURED_WEBHOOK' | 'MANUAL_CALLBACK' | 'VOICE_PROMISE_TO_PAY' | 'VOICE_PROMISE_UPI_RETRY' | 'VOICE_LINK_PAID_WEBHOOK' | 'SIMULATOR';
  recoveredAt?: string;
  timeToRecoverSeconds?: number;
  attributedChannel?: string;
  costOfIncentiveINR?: number;
  estimatedMdrFeeINR?: number;
  mdrRatePct?: number;
  businessInsights?: string;
  confidenceScore?: number;
}

export interface AuditLogEntry {
  id: string;
  caseId: string;
  agentName: string;
  action: string;
  inputSummary?: Record<string, any>;
  outputDecision?: Record<string, any>;
  rationale: string;
  model: string;
  latencyMs: number;
  tokensUsed: number;
  signatureHash: string;
  timestamp: string;
}

export interface DeadLetterPayment {
  id: string;
  eventId: string;
  event: string;
  paymentId?: string;
  paymentOrderId?: string;
  paymentLinkId?: string;
  amountINR: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  matched: boolean;
  matchedCaseId?: string;
  matchedAt?: string;
  createdAt: string;
  rawPayload: Record<string, any>;
}
