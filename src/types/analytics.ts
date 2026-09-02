/**
 * Analytics and dashboard types for RecoverFlow AI
 */

import { ChannelType } from './case';
import { CheckoutAbandonmentMetrics } from './checkout';
import { B2BReceivablesMetrics } from './invoice';
import { VoiceAnalytics } from './voice';
import { BankSwitchStatus } from './case';

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
  totalRevenueAtRiskINR: number;
  totalRevenueRecoveredINR: number;
  /** Revenue recovered AND independently settled via a live Razorpay webhook. */
  verifiedRecoveredINR: number;
  /** Revenue recovered via merchant-reported/simulated signals (not yet gateway-verified). */
  projectedRecoveredINR: number;
  recoveryRatePercentage: number;
  totalCasesCount: number;
  activeCasesCount: number;
  recoveredCasesCount: number;
  failedCasesCount: number;
  cooldownProtectedCount: number;
  outagePausedCount: number;
  avgRecoveryTimeMinutes: number;
  avgRecoveryTimeSeconds: number;
  totalIncentiveCostINR: number;
  totalRecoveryCostINR: number;
  totalMdrFeesINR: number;
  netRevenueSavedINR: number;
  recoveryROI: number;
  recoveredArrProjectedINR: number;
  netMarginProtectedINR: number;
  channelMetrics: ChannelRecoveryMetric[];
  rootCauseMetrics: RootCauseRecoveryMetric[];
  checkoutMetrics: CheckoutAbandonmentMetrics;
  receivablesMetrics: B2BReceivablesMetrics;
  voiceMetrics: VoiceAnalytics;
  batchTimestamp: string;
  settledCasesCount: number;
}
