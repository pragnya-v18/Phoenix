/**
 * Core case types for RecoverFlow AI
 */

export type CaseStatus = 
  | 'DETECTED'
  | 'DIAGNOSING'
  | 'NEGOTIATING'
  | 'PENDING_APPROVAL'
  | 'EXECUTING'
  | 'COOLDOWN_PROTECTED'
  | 'OUTAGE_PAUSED'
  | 'RECOVERED'
  | 'FAILED'
  | 'DISMISSED'
  | 'FOLLOWING_UP';

export type RiskTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CLVTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'NACH_MANDATE' | 'WALLET';

export type ChannelType = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'DIRECT_RETRY' | 'VOICE_CALL' | 'VOICE' | 'ACP_A2A';

export type RootCauseCategory = 
  | 'ISSUER_DOWNTIME'
  | 'LIMIT_EXCEEDED'
  | 'INSUFFICIENT_FUNDS'
  | 'AUTH_TIMEOUT'
  | 'MANDATE_EXPIRED'
  | 'CUSTOMER_FRICTION'
  | 'GATEWAY_ERROR'
  | 'CHECKOUT_STALL'
  | 'CHECKOUT_PAYMENT_DECLINE'
  | 'CHECKOUT_SESSION_EXPIRED'
  | 'CHECKOUT_PRICE_SENSITIVITY'
  | 'STICKY_CHECKOUT'
  | 'INVOICE_APPROVAL_DELAY'
  | 'INVOICE_PROCUREMENT_DELAY'
  | 'INVOICE_CASHFLOW_ISSUE'
  | 'INVOICE_DISPUTE'
  | 'INVOICE_MISSING_PO'
  | 'INVOICE_UNKNOWN';

export type BankSwitchStatus = 'HEALTHY' | 'DEGRADED' | 'OUTAGE';

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  clvTier: CLVTier;
  historicalRecoveries: number;
  totalLifetimeSpendINR: number;
  lastRecoveryCampaignAt?: string;
  isCoolingDown?: boolean;
  cooldownRemainingMinutes?: number;
}

export interface SourceEventPayload {
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  errorCode: string;
  errorDescription: string;
  occurredAt: string;
  bankCode?: string;
}

export interface DiagnosisRecord {
  rootCauseCategory: RootCauseCategory;
  rootCauseDetail: string;
  confidenceScore: number;
  isTransient: boolean;
  bankCode: string;
  bankSwitchHealthIndex: number;
  recommendedRailSwitch: PaymentMethod | 'NONE';
  diagnosedAt: string;
}

export interface StrategyRecord {
  recommendedAction: 'ACP_A2A_OFFER' | 'AUTO_SCHEDULED_RETRY' | 'PAYMENT_LINK_DISPATCH' | 'VOICE_CALL' | 'DISMISS';
  targetChannel: ChannelType;
  offeredDiscountPct: number;
  calculatedIncentiveINR: number;
  delayMinutes: number;
  reasoning: string;
  expectedRecoveryProbability: number;
  scheduledExecutionAt: string;
  generatedMessageCopy?: string;
  whatsAppInteractivePayload?: import('./protocol').WhatsAppInteractivePayload;
  confidenceScore?: number;
  antiAbuseEnforced?: boolean;
  antiAbuseReason?: string;
}

export interface RecoveryCase {
  caseId: string;
  merchantId: string;
  eventType: 'PAYMENT_FAILED' | 'SUBSCRIPTION_HALTED' | 'INVOICE_OVERDUE' | 'CHECKOUT_ABANDONED';
  status: CaseStatus;
  amount: number;
  currency: string;
  riskTier: RiskTier;
  customer: CustomerProfile;
  sourceEvent: SourceEventPayload;
  diagnosis?: DiagnosisRecord;
  strategy?: StrategyRecord;
  acpSession?: import('./protocol').ACPSession;
  compliance?: import('./protocol').ComplianceEvaluation;
  outcome?: import('./outcome').OutcomeRecord;
  checkoutProfile?: import('./checkout').CheckoutProfile;
  invoiceProfile?: import('./invoice').InvoiceProfile;
  voiceProfile?: import('./voice').VoiceAgentProfile;
  retryState?: {
    retryCount: number;
    maxRetries: number;
    lastRetryAt?: string;
    lastRetryChannel?: ChannelType;
    escalatedAt?: string;
    dismissedAt?: string;
  };
  refundState?: {
    isRefunded: boolean;
    refundAmountINR: number;
    refundId?: string;
    refundedAt?: string;
    originalRecoveredAmountINR: number;
  };
  humanActionNotes?: string;
  operatorId?: string;
  cooldownStatus?: {
    isCoolingDown: boolean;
    remainingMinutes: number;
    lastCampaignAt?: string;
  };
  outageStatus?: {
    isOutageBlocked: boolean;
    bankCode?: string;
    switchHealthPct?: number;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
}
