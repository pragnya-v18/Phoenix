/**
 * Checkout and cart abandonment types for RecoverFlow AI
 */

export type CheckoutStage =
  | 'CART_VIEW'
  | 'ADDRESS_ENTRY'
  | 'PAYMENT_SELECTION'
  | 'PAYMENT_AUTHORIZATION'
  | 'OTP_ENTRY'
  | 'FAILED';

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
