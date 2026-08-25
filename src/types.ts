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

export type CheckoutStage =
  | 'CART_VIEW'
  | 'ADDRESS_ENTRY'
  | 'PAYMENT_SELECTION'
  | 'PAYMENT_AUTHORIZATION'
  | 'OTP_ENTRY'
  | 'FAILED';

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

export interface CheckoutProfile {
  checkoutId: string;
  sessionId: string;
  abandonedAt: string;
  lastActivityAt: string;
  stageReached: CheckoutStage;
  cartValueINR: number;
  cartItems: Array<{
    name: string;
    quantity: number;
    priceINR: number;
  }>;
  totalCartItems: number;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browserSessionDurationSec: number;
  previousVisitCount: number;
  recoveryProbability: number;
}

export interface CheckoutAbandonmentMetrics {
  totalAbandonedCheckouts: number;
  totalRecoveredCheckouts: number;
  checkoutRecoveryRatePct: number;
  recoveredGMV_INR: number;
  totalAtRiskGMV_INR: number;
  avgRecoveryTimeMinutes: number;
  stageBreakdown: Array<{
    stage: CheckoutStage;
    stageLabel: string;
    abandonedCount: number;
    recoveredCount: number;
    recoveryRatePct: number;
    gmvAtRiskINR: number;
    gmvRecoveredINR: number;
  }>;
  channelBreakdown: Array<{
    channel: string;
    attempted: number;
    recovered: number;
    recoveryRatePct: number;
    gmvRecoveredINR: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    abandonedCount: number;
    recoveredCount: number;
    recoveryRatePct: number;
  }>;
}

export type InvoiceDPD = 'CURRENT' | 'OVERDUE_30' | 'OVERDUE_60' | 'OVERDUE_90_PLUS';

export type InvoicePaymentTerms = 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'NET_90' | 'NET_120' | 'DUE_ON_RECEIPT';

export interface PromiseToPayCommitment {
  commitmentId: string;
  caseId: string;
  promisedDate: string;
  promisedAmountINR: number;
  contactPerson: string;
  contactEmail: string;
  notes: string;
  status: 'PENDING' | 'KEPT' | 'MISSED' | 'ESCALATED';
  createdAt: string;
  updatedAt: string;
}

// ================================================================
// VOICE RECOVERY AGENT TYPES
// ================================================================

export type VoiceCallOutcome = 'ANSWERED' | 'NO_ANSWER' | 'CALLBACK_REQUESTED' | 'PROMISE_TO_PAY' | 'REJECTED';

export type VoiceLanguageVariant = 'ENGLISH' | 'HINGLISH' | 'HINDI';

export type VoiceToneVariant = 'PROFESSIONAL' | 'EMPATHETIC' | 'URGENT' | 'FRIENDLY' | 'CORPORATE';

export interface VoiceScriptSegment {
  segment: 'GREETING' | 'ISSUE_EXPLANATION' | 'RECOVERY_OFFER' | 'PAYMENT_CTA' | 'FOLLOW_UP' | 'CLOSING';
  textEN: string;
  textHinglish: string;
  textHindi: string;
}

export interface VoiceAgentProfile {
  agentId: string;
  caseId: string;
  phoneNumber: string;
  callerName: string;
  languageVariant: VoiceLanguageVariant;
  toneVariant: VoiceToneVariant;
  scriptSegments: VoiceScriptSegment[];
  retryCount: number;
  maxRetries: number;
  callStartedAt: string;
  callEndedAt?: string;
  callDurationSeconds?: number;
  outcome?: VoiceCallOutcome;
  outcomeReason?: string;
  promisedPaymentDate?: string;
  promisedAmountINR?: number;
  followUpScheduledAt?: string;
  dnis: string; // dialed number identification service
  ani: string;  // automatic number identification
  campaignId: string;
}

export interface VoiceAnalytics {
  totalCallsPlaced: number;
  totalCallsAnswered: number;
  totalCallsNoAnswer: number;
  totalCallbacksRequested: number;
  totalPromisesToPay: number;
  totalRejected: number;
  callSuccessRatePct: number;
  callbackConversionRatePct: number;
  promiseToPayConversionRatePct: number;
  avgCallDurationSeconds: number;
  totalCallCostINR: number;
  avgCostPerCallINR: number;
  revenueRecoveredViaVoiceINR: number;
  costPerRecoveryINR: number;
  languageBreakdown: Array<{
    variant: VoiceLanguageVariant;
    label: string;
    callCount: number;
    successRatePct: number;
    ptpRatePct: number;
  }>;
  outcomeBreakdown: Array<{
    outcome: VoiceCallOutcome;
    label: string;
    count: number;
    pct: number;
  }>;
  retryStats: {
    avgRetriesBeforeAnswer: number;
    firstAttemptSuccessPct: number;
    retrySuccessPct: number;
  };
}

export interface InvoiceProfile {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  daysPastDue: number;
  dpdBucket: InvoiceDPD;
  outstandingAmountINR: number;
  originalAmountINR: number;
  paymentTerms: InvoicePaymentTerms;
  companyName: string;
  companyGstin?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  invoiceItems: Array<{
    description: string;
    quantity: number;
    unitPriceINR: number;
  }>;
  poNumber?: string;
  gracePeriodDays: number;
  totalLifetimeBusinessINR: number;
  historicalOnTimePaymentRate: number;
  recoveryProbability: number;
}

export interface B2BReceivablesMetrics {
  totalOverdueInvoices: number;
  totalRecoveredInvoices: number;
  receivablesRecoveryRatePct: number;
  totalOutstandingINR: number;
  totalRecoveredINR: number;
  avgDaysToCollect: number;
  promiseToPayCount: number;
  promiseToPayConversionRatePct: number;
  agingBreakdown: Array<{
    bucket: InvoiceDPD;
    bucketLabel: string;
    invoiceCount: number;
    recoveredCount: number;
    outstandingINR: number;
    recoveredINR: number;
    recoveryRatePct: number;
  }>;
  rootCauseBreakdown: Array<{
    cause: string;
    causeLabel: string;
    invoiceCount: number;
    recoveredCount: number;
    recoveryRatePct: number;
  }>;
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
  recommendedAction: 'ACP_A2A_OFFER' | 'AUTO_SCHEDULED_RETRY' | 'PAYMENT_LINK_DISPATCH' | 'VOICE_CALL' | 'DISMISS';
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
  checkoutProfile?: CheckoutProfile;
  invoiceProfile?: InvoiceProfile;
  voiceProfile?: VoiceAgentProfile;
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

  // 5. Checkout Abandonment Recovery Metrics
  checkoutMetrics: CheckoutAbandonmentMetrics;

  // 6. B2B Receivables Recovery Metrics
  receivablesMetrics: B2BReceivablesMetrics;

  // 7. Voice Recovery Agent Metrics
  voiceMetrics: VoiceAnalytics;
  
  // 8. Batch Verification Metadata
  batchTimestamp: string;
  settledCasesCount: number;
}
