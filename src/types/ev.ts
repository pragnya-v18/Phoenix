/**
 * Expected Value (EV) recovery economics types for RecoverFlow AI
 *
 * EV = P(success) x netRecoverable - totalCost
 * where totalCost = incentive + MDR fee + channel ops cost + customer-friction penalty.
 * A negative-EV action must be REJECTED before reaching execution.
 */

export interface ExpectedValueAssessment {
  /** Final expected value after all costs (₹). EV <= 0 => isNegativeEV */
  expectedValueINR: number;
  /** P(success) — the strategy's expected recovery probability */
  successProbability: number;
  /** P x netRecoverable — revenue the action expects to capture before costs (₹) */
  grossExpectedINR: number;
  /** Amount the merchant would collect if the customer pays (₹) */
  netRecoverableINR: number;
  /** incentive + MDR + ops + friction (₹) */
  totalCostINR: number;
  incentiveINR: number;
  mdrFeeINR: number;
  opsCostINR: number;
  /** Customer-friction penalty = effort factor x netRecoverable (₹) */
  frictionPenaltyINR: number;
  isNegativeEV: boolean;
  verdict: 'EXECUTE' | 'REJECT';
  rationale: string;
}