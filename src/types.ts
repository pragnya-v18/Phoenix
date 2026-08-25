/**
 * RecoverFlow AI v2 - Universal TypeScript Definitions
 * Razorpay Buildathon 2026 - Track 03 (AI Revenue Recovery)
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
  | 'DISMISSED';

export type RiskTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CLVTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'NACH_MANDATE' | 'WALLET';

export type ChannelType = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'DIRECT_RETRY' | 'VOICE_CALL' | 'ACP_A2A';

export type RootCauseCategory = 
  | 'ISSUER_DOWNTIME'
  | 'LIMIT_EXCEEDED'
  | 'INSUFFICIENT_FUNDS'
  | 'AUTH_TIMEOUT'
  | 'MANDATE_EXPIRED'
  | 'CUSTOMER_FRICTION'
  | 'GATEWAY_ERROR';

export type BankSwitchStatus = 'HEALTHY' | 'DEGRADED' | 'OUTAGE';

export interface AntiAbusePolicyConfig {
  maxRecoveriesPer30Days: number;
  maxDiscountsPerCustomer: number;
  customerCooldownMinutes?: number;
  cooldownPeriodHours?: number;
  globalOutageThresholdSuccessRatePct?: number;
  enforceZeroDiscountOnAbuse?: boolean;
}

export interface WhatsAppButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface WhatsAppInteractivePayload {
  messaging_product?: 'whatsapp';
  recipient_type?: 'individual';
  to?: string;
  type?: 'interactive' | 'button' | 'cta_url';
  interactive?: {
    type: 'button' | 'cta_url' | 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons?: WhatsAppButton[];
      name?: string;
      parameters?: {
        display_text: string;
        url: string;
      };
    };
  };
  header?: {
    type: 'text';
    text: string;
  };
  body?: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action?: {
    buttons?: WhatsAppButton[];
    name?: string;
    parameters?: {
      display_text: string;
      url: string;
    };
  };
}

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
  amount: number; // In INR
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
  bankSwitchHealthIndex: number; // 0 to 100
  recommendedRailSwitch: PaymentMethod | 'NONE';
  diagnosedAt: string;
}

export interface StrategyRecord {
  recommendedAction: 'ACP_A2A_OFFER' | 'AUTO_SCHEDULED_RETRY' | 'PAYMENT_LINK_DISPATCH' | 'DISMISS';
  targetChannel: ChannelType;
  offeredDiscountPct: number;
  calculatedIncentiveINR: number;
  delayMinutes: number;
  reasoning: string;
  expectedRecoveryProbability: number;
  scheduledExecutionAt: string;
  generatedMessageCopy?: string;
  whatsAppInteractivePayload?: WhatsAppInteractivePayload;
  confidenceScore?: number;
  antiAbuseEnforced?: boolean;
  antiAbuseReason?: string;
}

export interface ACPMessage {
  id: string;
  sender: 'MerchantRecoveryAgent' | 'CustomerWalletAgent';
  receiver: 'CustomerWalletAgent' | 'MerchantRecoveryAgent';
  intent: 'HANDSHAKE' | 'PROPOSE_OFFER' | 'COUNTER_OFFER' | 'ACCEPT_AND_COMMIT' | 'REJECT';
  payload: {
    discountPct?: number;
    netAmount?: number;
    selectedMethod?: PaymentMethod;
    cardLast4?: string;
    consentToken?: string;
    message?: string;
    expiresInMinutes?: number;
  };
  timestamp: string;
}

export interface ACPSession {
  sessionId: string;
  status: 'PROPOSED' | 'COUNTER_OFFER' | 'ACCEPTED' | 'REJECTED';
  protocolVersion: string;
  dialogue: ACPMessage[];
}

export interface ComplianceEvaluation {
  approved: boolean;
  rulesPassed: string[];
  violations: string[];
  requiresHumanApproval: boolean;
  evaluatedAt: string;
  reasoningSummary?: string;
  confidenceScore?: number;
}

export interface OutcomeRecord {
  isRecovered: boolean;
  recoveredAmount: number;
  settledPaymentId?: string;
  paymentLinkId?: string;
  reconciliationMethod?: 'PAYMENT_LINK_PAID_WEBHOOK' | 'PAYMENT_CAPTURED_WEBHOOK' | 'MANUAL_CALLBACK' | 'SIMULATOR';
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
  acpSession?: ACPSession;
  compliance?: ComplianceEvaluation;
  outcome?: OutcomeRecord;
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

export interface BankHealthMetric {
  bankCode: string;
  name: string;
  networkType: string;
  rollingSuccessRatePct: number;
  status: BankSwitchStatus;
  sampleCountLast15Min: number;
  latencyMs: number;
  lastUpdated: string;
  consecutiveOutageMinutes?: number;
  autoPausedWorkflowsCount?: number;
}

export interface ChannelRecoveryMetric {
  channel: ChannelType | string;
  channelName: string;
  attemptedCases: number;
  recoveredCases: number;
  revenueAtRiskINR: number;
  revenueRecoveredINR: number;
  channelRecoveryRatePct: number;
  avgRecoveryTimeSec: number;
  totalIncentiveINR: number;
  totalRecoveryCostINR: number;
  totalMdrFeeINR: number;
  netRevenueSavedINR: number;
  roiMultiplier: number;
}

export interface RootCauseRecoveryMetric {
  rootCause: string;
  rootCauseLabel: string;
  totalCases: number;
  recoveredCases: number;
  revenueAtRiskINR: number;
  revenueRecoveredINR: number;
  recoveryRatePct: number;
}

export interface ExecutiveKPIs {
  // 1. Core Revenue Metrics
  totalRevenueAtRiskINR: number;
  totalRevenueRecoveredINR: number;
  recoveryRatePercentage: number;
  
  // 2. Operational & Velocity Metrics
  totalCasesCount: number;
  activeCasesCount: number;
  recoveredCasesCount: number;
  failedCasesCount: number;
  cooldownProtectedCount: number;
  outagePausedCount: number;
  avgRecoveryTimeMinutes: number;
  avgRecoveryTimeSeconds: number;

  // 3. Cost & Profitability Evidence (With MDR & Interchange)
  totalIncentiveCostINR: number;
  totalRecoveryCostINR: number; // Cloud compute + SMS/WhatsApp gateway + Payment routing cost
  totalMdrFeesINR: number; // Razorpay Gateway MDR & Interchange network processing fees
  netRevenueSavedINR: number; // totalRevenueRecoveredINR - (totalIncentiveCostINR + totalRecoveryCostINR + totalMdrFeesINR)
  recoveryROI: number; // netRevenueSavedINR / (totalIncentiveCostINR + totalRecoveryCostINR + totalMdrFeesINR)
  recoveredArrProjectedINR: number;
  netMarginProtectedINR: number;

  // 4. Breakdown Dimensions calculated from case records
  channelMetrics: ChannelRecoveryMetric[];
  rootCauseMetrics: RootCauseRecoveryMetric[];
  
  // 5. Batch Verification Metadata
  batchTimestamp: string;
  settledCasesCount: number;
}
