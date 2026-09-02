/**
 * RecoverFlow AI - Expected Value (EV) Recovery Economic Engine
 * Razorpay Buildathon 2026 - Track 03 (AI Revenue Recovery)
 *
 * Deterministic economic guardrail stage:
 *   EV = P(success) x netRecoverable - totalCost
 *   totalCost = incentive + MDR fee + channel ops cost + customer-friction penalty
 *
 * The LLM Strategy Agent proposes an intervention; this engine decides whether it
 * is economically worth doing. Negative-EV actions are REJECTED on the spot so a
 * confident but costly recovery never spends more than the case can return.
 */

import {
  StrategyRecord,
  PaymentMethod,
  ChannelType,
  ExpectedValueAssessment
} from '../../src/types/index.js';
import { FinancialAccountingEngine } from './financials.js';

/** Dispatch cost (₹) incurred once per outbound recovery attempt, per channel. */
export const CHANNEL_OPS_COST_INR: Record<ChannelType, number> = {
  WHATSAPP: 1.5,
  SMS: 0.25,
  EMAIL: 0.1,
  DIRECT_RETRY: 0.5,
  VOICE_CALL: 8.0,
  VOICE: 8.0,
  ACP_A2A: 3.0,
};

/**
 * Customer-friction penalty expressed as a fraction of the net recoverable amount.
 * High-effort channels (phone call) erode expected value even when P(success) is high,
 * because a customer asked to do more is statistically likelier to abandon.
 */
export const CHANNEL_FRICTION_PCT: Record<ChannelType, number> = {
  WHATSAPP: 0.015,
  SMS: 0.025,
  EMAIL: 0.008,
  DIRECT_RETRY: 0.02,
  VOICE_CALL: 0.06,
  VOICE: 0.06,
  ACP_A2A: 0.008,
};

export class ExpectedValueEngine {
  /**
   * Pure EV assessment for a proposed strategy. No I/O, no LLM — deterministic.
   */
  public static evaluate(
    amountINR: number,
    action: StrategyRecord,
    paymentMethod: PaymentMethod = 'CARD',
    isPremiumInstrument: boolean = false
  ): ExpectedValueAssessment {
    const safeAmount = Math.max(0, amountINR);
    const successProbability = Math.min(0.99, Math.max(0, action.expectedRecoveryProbability || 0.5));

    const incentiveINR = Math.max(0, action.calculatedIncentiveINR || 0);
    const netRecoverableINR = Math.max(0, safeAmount - incentiveINR);

    // Gateway costs (MDR + GST) on the amount the merchant would actually collect.
    const mdrCalc = FinancialAccountingEngine.calculateMDRFee(
      netRecoverableINR,
      paymentMethod,
      isPremiumInstrument
    );
    const mdrFeeINR = mdrCalc.totalMdrFeeINR;

    const opsCostINR = CHANNEL_OPS_COST_INR[action.targetChannel] ?? 0.5;
    const frictionPenaltyINR = (CHANNEL_FRICTION_PCT[action.targetChannel] ?? 0.02) * netRecoverableINR;

    const totalCostINR = Number((incentiveINR + mdrFeeINR + opsCostINR + frictionPenaltyINR).toFixed(2));
    const grossExpectedINR = Number((successProbability * netRecoverableINR).toFixed(2));
    const expectedValueINR = Number((grossExpectedINR - totalCostINR).toFixed(2));

    const isNegativeEV = expectedValueINR <= 0;
    const verdict: 'EXECUTE' | 'REJECT' = isNegativeEV ? 'REJECT' : 'EXECUTE';

    const rationale = isNegativeEV
      ? `Action REJECTED on economics: EV ₹${expectedValueINR.toFixed(2)} <= 0. ` +
        `P(${Math.round(successProbability * 100)}%) x net ₹${Math.round(netRecoverableINR).toLocaleString('en-IN')} ` +
        `= gross ₹${Math.round(grossExpectedINR).toLocaleString('en-IN')}, but costs ` +
        `(incentive ₹${Math.round(incentiveINR).toLocaleString('en-IN')} + MDR ₹${Math.round(mdrFeeINR).toLocaleString('en-IN')} + ` +
        `ops ₹${opsCostINR.toFixed(2)} + friction ₹${Math.round(frictionPenaltyINR).toLocaleString('en-IN')}) ` +
        `consume the entire expected return.`
      : `Action approved: EV ₹${expectedValueINR.toFixed(2)} > 0. ` +
        `P(${Math.round(successProbability * 100)}%) x net ₹${Math.round(netRecoverableINR).toLocaleString('en-IN')} ` +
        `= gross ₹${Math.round(grossExpectedINR).toLocaleString('en-IN')} vs total cost ` +
        `₹${Math.round(totalCostINR).toLocaleString('en-IN')} ` +
        `(incentive ₹${Math.round(incentiveINR).toLocaleString('en-IN')} + MDR ₹${Math.round(mdrFeeINR).toLocaleString('en-IN')} + ` +
        `ops ₹${opsCostINR.toFixed(2)} + friction ₹${Math.round(frictionPenaltyINR).toLocaleString('en-IN')}).`;

    return {
      expectedValueINR,
      successProbability,
      grossExpectedINR,
      netRecoverableINR,
      totalCostINR,
      incentiveINR,
      mdrFeeINR,
      opsCostINR,
      frictionPenaltyINR,
      isNegativeEV,
      verdict,
      rationale
    };
  }

  /**
   * Convenience: attach the EV assessment to a strategy in place and return it.
   * Used by every pipeline right after the Strategy Agent emits a candidate.
   */
  public static attachEV(
    strategy: StrategyRecord,
    amountINR: number,
    paymentMethod: PaymentMethod = 'CARD',
    isPremiumInstrument: boolean = false
  ): StrategyRecord {
    strategy.ev = ExpectedValueEngine.evaluate(amountINR, strategy, paymentMethod, isPremiumInstrument);
    return strategy;
  }

  /**
   * Sensitivity analysis for the UI: EV at +/-5pp success probability for the
   * selected strategy. Answers "how robust is this decision to overconfidence?"
   */
  public static sensitivity(
    amountINR: number,
    action: StrategyRecord,
    paymentMethod: PaymentMethod = 'CARD',
    spreadPct: number = 0.05
  ): { pessimistic: ExpectedValueAssessment; optimistic: ExpectedValueAssessment } {
    const pessimisticCopy: StrategyRecord = { ...action, expectedRecoveryProbability: Math.max(0.05, action.expectedRecoveryProbability - spreadPct) };
    const optimisticCopy: StrategyRecord = { ...action, expectedRecoveryProbability: Math.min(0.99, action.expectedRecoveryProbability + spreadPct) };
    return {
      pessimistic: ExpectedValueEngine.evaluate(amountINR, pessimisticCopy, paymentMethod),
      optimistic: ExpectedValueEngine.evaluate(amountINR, optimisticCopy, paymentMethod)
    };
  }
}