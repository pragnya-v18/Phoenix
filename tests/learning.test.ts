import { describe, it, expect } from 'vitest';
import {
  buildLearningOutcome,
  getLearningMetrics,
  similarHistory,
  applyHistoricalEvidence,
  clampProbability,
  channelStats
} from '../backend/services/learning-engine.js';
import type { RecoveryCase, StrategyRecord, RecoveryLearningOutcome } from '../src/types/index.js';

const base = {
  merchantId: 'mer_test',
  currency: 'INR',
  riskTier: 'HIGH' as const,
  customer: { id: 'cust_x', name: 'A', phone: '+91 90000 00000', email: 'a@x.com', clvTier: 'SILVER' as const, historicalRecoveries: 0, totalLifetimeSpendINR: 1000 },
  sourceEvent: { paymentId: 'pay_x', orderId: 'order_x', amount: 5000, currency: 'INR', method: 'CARD' as const, errorCode: 'LIMIT', errorDescription: 'x', occurredAt: '2026-01-01T00:00:00Z', bankCode: 'HDFC' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z'
};

const mkStrategy = (p: number, channel?: string): StrategyRecord => ({
  recommendedAction: 'PAYMENT_LINK_DISPATCH',
  targetChannel: (channel || 'WHATSAPP') as any,
  offeredDiscountPct: 0,
  calculatedIncentiveINR: 0,
  delayMinutes: 0,
  reasoning: 't',
  expectedRecoveryProbability: p,
  scheduledExecutionAt: '2026-01-01T00:00:00Z',
  tokensUsed: 0
});

const mkCase = (id: string, status: string, p: number, opts?: { channel?: string; rootCause?: string; recoveryAmount?: number }): RecoveryCase => {
  const isRecovered = status === 'RECOVERED';
  const c: RecoveryCase = {
    ...base,
    caseId: id,
    eventType: 'PAYMENT_FAILED',
    status: status as any,
    amount: 5000,
    riskTier: 'HIGH',
    diagnosis: { rootCauseCategory: (opts?.rootCause || 'LIMIT_EXCEEDED') as any, rootCauseDetail: 'd', confidenceScore: 0.9, isTransient: false, bankCode: 'HDFC', bankSwitchHealthIndex: 95, recommendedRailSwitch: 'CARD', diagnosedAt: '2026-01-01T00:00:00Z', tokensUsed: 0 },
    strategy: mkStrategy(p, opts?.channel),
    outcome: isRecovered ? { isRecovered: true, recoveredAmount: opts?.recoveryAmount ?? base.sourceEvent.amount, reconciliationMethod: 'PAYMENT_LINK_PAID_WEBHOOK', recoveredAt: '2026-01-02T00:00:00Z', timeToRecoverSeconds: 60 } : undefined
  };
  return c;
};

describe('Learning record capture (buildLearningOutcome)', () => {
  it('captures a terminal RECOVERED case with strategy as SUCCESS', () => {
    const o = buildLearningOutcome(mkCase('L-1', 'RECOVERED', 0.88, { channel: 'WHATSAPP', recoveryAmount: 4750 }));
    expect(o).not.toBeNull();
    expect(o!.actualOutcome).toBe('SUCCESS');
    expect(o!.predictedProbability).toBe(0.88);
    expect(o!.recoveredAmountINR).toBe(4750);
    expect(o!.selectedChannel).toBe('WHATSAPP');
    expect(o!.rootCauseCategory).toBe('LIMIT_EXCEEDED');
  });

  it('records DISMISSED/FAILED as FAILURE with a failure reason', () => {
    const dismissed = mkCase('L-2', 'DISMISSED', 0.9);
    const o = buildLearningOutcome(dismissed);
    expect(o).not.toBeNull();
    expect(o!.actualOutcome).toBe('FAILURE');
    expect(o!.recoveredAmountINR).toBe(0);
    expect(o!.failureReason).toBeDefined();
  });

  it('excludes non-terminal and no-strategy cases (e.g. settlement-guard-blocked)', () => {
    const open = { ...mkCase('L-3', 'DETECTED', 0.5), strategy: undefined };
    expect(buildLearningOutcome(open as RecoveryCase)).toBeNull();

    const guarded = { ...mkCase('L-4', 'DISMISSED', 0.5), strategy: undefined, settlementGuard: { status: 'settled', blocked: true, verdict: 'PAYMENT_ALREADY_SETTLED_BLOCKED_ACTION' } };
    expect(buildLearningOutcome(guarded as RecoveryCase)).toBeNull();
  });
});

describe('Learning metrics & calibration', () => {
  const outcomes: RecoveryLearningOutcome[] = [
    { caseId: 'A', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.9, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-01T00:00:00Z' },
    { caseId: 'B', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'FAILURE', recoveredAmountINR: 0, recordedAt: '2026-01-02T00:00:00Z' },
    { caseId: 'C', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'ISSUER_DOWNTIME', riskTier: 'HIGH', predictedProbability: 0.7, selectedChannel: 'EMAIL', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-03T00:00:00Z' }
  ];

  it('predicts accuracy at the 0.5 threshold and flags false positives', () => {
    const m = getLearningMetrics(outcomes);
    // A (pred >0.5, success) = correct; B (pred >0.5, fail) = wrong; C (pred >0.5, success) = correct
    expect(m.predictionAccuracyPct).toBe(66.67);
    expect(m.falsePositives).toBe(1); // B
    expect(m.falseNegatives).toBe(0);
    expect(m.casesLearnedFrom).toBe(3);
  });

  it('computes per-channel effectiveness from the stored outcomes', () => {
    const m = getLearningMetrics(outcomes);
    const whatsapp = m.channelEffectiveness.find(c => c.channel === 'WHATSAPP');
    expect(whatsapp).toBeDefined();
    expect(whatsapp!.attempts).toBe(2);
    expect(whatsapp!.successRatePct).toBe(50);
  });

  it('buckets calibration by predicted-confidence bands', () => {
    const m = getLearningMetrics(outcomes);
    const high = m.calibration.find(b => b.bucket === '67%+');
    expect(high).toBeDefined();
    expect(high!.count).toBe(3);
    expect(high!.avgPredictedPct).toBe(80);
    expect(high!.actualSuccessPct).toBe(66.67);
  });

  it('is deterministic across calls (no timestamps compared)', () => {
    const a = getLearningMetrics(outcomes);
    const b = getLearningMetrics(outcomes);
    expect(a.predictionAccuracyPct).toBe(b.predictionAccuracyPct);
    expect(a.calibration).toEqual(b.calibration);
    expect(a.channelEffectiveness).toEqual(b.channelEffectiveness);
  });
});

describe('Similar-history matching', () => {
  const outcomes: RecoveryLearningOutcome[] = [
    { caseId: 'H1', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.9, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-01T00:00:00Z' },
    { caseId: 'H2', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'FAILURE', recoveredAmountINR: 0, recordedAt: '2026-01-02T00:00:00Z' },
    { caseId: 'H3', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'MEDIUM', predictedProbability: 0.7, selectedChannel: 'EMAIL', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-03T00:00:00Z' },
    { caseId: 'H4', merchantId: 'm', eventType: 'CHECKOUT_ABANDONED', rootCauseCategory: 'CHECKOUT_STALL', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'SMS', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-04T00:00:00Z' }
  ];

  it('matches exact root-cause category first', () => {
    const h = similarHistory({ rootCauseCategory: 'LIMIT_EXCEEDED', eventType: 'PAYMENT_FAILED', riskTier: 'HIGH' }, outcomes);
    expect(h.similarCases).toBe(3);
    expect(h.minSamplesMet).toBe(true);
    expect(h.successRatePct).toBe(66.67);
  });

  it('falls back to event-type + risk-tier when category evidence is thin', () => {
    const h = similarHistory({ rootCauseCategory: 'INSUFFICIENT_FUNDS', eventType: 'CHECKOUT_ABANDONED', riskTier: 'HIGH' }, outcomes);
    expect(h.similarCases).toBe(1); // only H4
    expect(h.minSamplesMet).toBe(false);
  });
});

describe('Historical evidence adjustment (applyHistoricalEvidence)', () => {
  const outcomes: RecoveryLearningOutcome[] = [
    { caseId: 'E1', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.9, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-01T00:00:00Z' },
    { caseId: 'E2', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'FAILURE', recoveredAmountINR: 0, recordedAt: '2026-01-02T00:00:00Z' },
    { caseId: 'E3', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.9, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-03T00:00:00Z' }
  ];

  it('dampens an overconfident 0.95 prediction when history says 66.7%', () => {
    const caseItem = mkCase('E-ADJ', 'DETECTED', 0.95, { rootCause: 'LIMIT_EXCEEDED' });
    const adjusted = applyHistoricalEvidence(mkStrategy(0.95, 'WHATSAPP'), caseItem, outcomes);
    // weight = min(1, 3/20) = 0.15 → 0.95 + (0.6667 - 0.95) * 0.15 ≈ 0.9075
    expect(adjusted.expectedRecoveryProbability).toBeCloseTo(0.9075, 2);
    expect(adjusted.recoveryEvidence).toBeDefined();
  });

  it('stamps the before/after evidence and influence direction', () => {
    const caseItem = mkCase('E-ADJ2', 'DETECTED', 0.95, { rootCause: 'LIMIT_EXCEEDED' });
    const adjusted = applyHistoricalEvidence(mkStrategy(0.95, 'WHATSAPP'), caseItem, outcomes);
    const ev = adjusted.recoveryEvidence!;
    expect(ev.rawProbability).toBe(95);
    expect(ev.adjustedProbability).toBeCloseTo(90.75, 1);
    expect(ev.influence).toBe('calibrated-down');
    expect(ev.similarCases).toBe(3);
    expect(ev.historicalSuccessRatePct).toBe(66.67);
  });

  it('recommends a channel with meaningfully better history', () => {
    const chCases = mkCase('E-CH', 'DETECTED', 0.8, { rootCause: 'LIMIT_EXCEEDED' });
    const chOutcomes: RecoveryLearningOutcome[] = [
      // WHATSAPP 3/6 = 50%
      { caseId: 'W1', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-01T00:00:00Z' },
      { caseId: 'W2', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'FAILURE', recoveredAmountINR: 0, recordedAt: '2026-01-02T00:00:00Z' },
      { caseId: 'W3', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-03T00:00:00Z' },
      { caseId: 'W4', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'FAILURE', recoveredAmountINR: 0, recordedAt: '2026-01-04T00:00:00Z' },
      { caseId: 'W5', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'FAILURE', recoveredAmountINR: 0, recordedAt: '2026-01-05T00:00:00Z' },
      { caseId: 'W6', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'WHATSAPP', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-06T00:00:00Z' },
      // EMAIL 3/3 = 100%
      { caseId: 'M1', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'EMAIL', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-07T00:00:00Z' },
      { caseId: 'M2', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'EMAIL', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-08T00:00:00Z' },
      { caseId: 'M3', merchantId: 'm', eventType: 'PAYMENT_FAILED', rootCauseCategory: 'LIMIT_EXCEEDED', riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'EMAIL', incentiveINR: 0, amountINR: 5000, actualOutcome: 'SUCCESS', recoveredAmountINR: 5000, recordedAt: '2026-01-09T00:00:00Z' }
    ];
    const adjusted = applyHistoricalEvidence(mkStrategy(0.8, 'WHATSAPP'), chCases, chOutcomes);
    // EMAIL 100% beats WHATSAPP 50% by >10pp with >=3 attempts
    expect(adjusted.recoveryEvidence!.influence).toBe('channel-shift');
    expect(adjusted.recoveryEvidence!.recommendedChannel).toBe('EMAIL');
  });

  it('only touches probability/evidence — decision type, channel and incentive are preserved, clamped to [0.05, 0.97]', () => {
    const caseItem = mkCase('E-G', 'DETECTED', 0.99, { rootCause: 'LIMIT_EXCEEDED' });
    const original = mkStrategy(0.99, 'WHATSAPP');
    const adjusted = applyHistoricalEvidence(original, caseItem, outcomes);
    expect(adjusted.expectedRecoveryProbability).toBeLessThanOrEqual(0.97);
    expect(adjusted.recommendedAction).toBe(original.recommendedAction);
    expect(adjusted.targetChannel).toBe(original.targetChannel);
    expect(adjusted.calculatedIncentiveINR).toBe(original.calculatedIncentiveINR);
    expect(adjusted.offeredDiscountPct).toBe(original.offeredDiscountPct);
    // Security boundary: evidence is applied to the decision signal only — the
    // stored strategy keeps no notion of compliance/settlement (those live on the case)
    // and benchmark tests confirm a settlement-guarded case is never dispatched.
    expect((adjusted as any).settlementGuard).toBeUndefined();
  });

  it('returns the strategy untouched when history is below the minimum sample count', () => {
    const thin = outcomes.slice(0, 1); // only 1 similar case
    const caseItem = mkCase('E-THIN', 'DETECTED', 0.8, { rootCause: 'LIMIT_EXCEEDED' });
    const adjusted = applyHistoricalEvidence(mkStrategy(0.8, 'WHATSAPP'), caseItem, thin);
    expect(adjusted.expectedRecoveryProbability).toBe(0.8);
    expect(adjusted.recoveryEvidence).toBeUndefined();
  });

  it('is deterministic for identical inputs', () => {
    const caseItem = mkCase('E-DET', 'DETECTED', 0.9, { rootCause: 'LIMIT_EXCEEDED' });
    const a = applyHistoricalEvidence(mkStrategy(0.9, 'WHATSAPP'), caseItem, outcomes);
    const b = applyHistoricalEvidence(mkStrategy(0.9, 'WHATSAPP'), caseItem, outcomes);
    expect(a).toEqual(b);
  });
});

describe('Probability safety rail', () => {
  it('clamps to the [0.05, 0.97] band (no infinite-EV from overconfidence)', () => {
    expect(clampProbability(5)).toBe(0.97);
    expect(clampProbability(-0.5)).toBe(0.05);
    expect(clampProbability(NaN)).toBe(0.05);
    expect(clampProbability(0.61)).toBe(0.61);
  });

  it('channelStats is deterministic and sorted by attempts', () => {
    const stats = channelStats([
      { caseId: '1', merchantId: 'm', eventType: 'P', rootCauseCategory: null, riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'EMAIL', incentiveINR: 0, amountINR: 10, actualOutcome: 'SUCCESS' as const, recoveredAmountINR: 10, recordedAt: '2026-01-01T00:00:00Z' },
      { caseId: '2', merchantId: 'm', eventType: 'P', rootCauseCategory: null, riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'SMS', incentiveINR: 0, amountINR: 10, actualOutcome: 'SUCCESS' as const, recoveredAmountINR: 10, recordedAt: '2026-01-01T00:00:00Z' },
      { caseId: '3', merchantId: 'm', eventType: 'P', rootCauseCategory: null, riskTier: 'HIGH', predictedProbability: 0.8, selectedChannel: 'EMAIL', incentiveINR: 0, amountINR: 10, actualOutcome: 'FAILURE' as const, recoveredAmountINR: 0, recordedAt: '2026-01-01T00:00:00Z' }
    ]);
    expect(stats[0].channel).toBe('EMAIL');
    expect(stats[0].attempts).toBe(2);
    expect(stats[0].successRatePct).toBe(50);
  });
});