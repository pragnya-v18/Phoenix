/**
 * Voice recovery agent types for RecoverFlow AI
 */

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
  dnis: string;
  ani: string;
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
