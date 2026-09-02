import { describe, it, expect, afterEach, vi } from 'vitest';
import { computeKPIs } from '../backend/services/kpi-engine.js';
import { BenchmarkService } from '../backend/services/benchmark.js';
import { ExpectedValueEngine } from '../backend/services/ev-optimizer.js';
import { RazorpayService } from '../backend/razorpay.js';
import { FinancialAccountingEngine } from '../backend/services/financials.js';
import type { RecoveryCase } from '../src/types/index.js';

const base = {
  merchantId: 'mer_test',
  currency: 'INR',
  riskTier: 'MEDIUM' as const,
  customer: { id: 'cust_x', name: 'A', phone: '+91 90000 00000', email: 'a@x.com', clvTier: 'SILVER' as const, historicalRecoveries: 0, totalLifetimeSpendINR: 1000 },
  sourceEvent: { paymentId: 'pay_x', orderId: 'order_x', amount: 1000, currency: 'INR', method: 'CARD' as const, errorCode: 'X', errorDescription: 'y', occurredAt: new Date().toISOString(), bankCode: 'HDFC' },
  tokensUsed: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

const mkCase = (id: string, amount: number, status: string, method?: string): RecoveryCase => ({
  ...base,
  caseId: id,
  amount,
  eventType: 'PAYMENT_FAILED',
  status: status as any,
  outcome: method
    ? { isRecovered: true, recoveredAmount: amount, reconciliationMethod: method as any, recoveredAt: '2026-01-02T00:00:00Z', timeToRecoverSeconds: 60 }
    : undefined
});

describe('Verified vs Projected revenue accounting', () => {
  it('webhook-reconciled recoveries are VERIFIED; simulator/callback are PROJECTED', () => {
    const k = computeKPIs([
      mkCase('V1', 1000, 'RECOVERED', 'PAYMENT_LINK_PAID_WEBHOOK'),
      mkCase('V2', 2000, 'RECOVERED', 'PAYMENT_CAPTURED_WEBHOOK'),
      mkCase('V3', 500, 'RECOVERED', 'VOICE_LINK_PAID_WEBHOOK'),
      mkCase('P1', 4000, 'RECOVERED', 'SIMULATOR'),
      mkCase('P2', 3000, 'RECOVERED', 'MANUAL_CALLBACK')
    ]);
    expect(k.verifiedRecoveredINR).toBe(3500);
    expect(k.projectedRecoveredINR).toBe(7000);
    expect(k.totalRevenueRecoveredINR).toBe(10500);
  });

  it('cases with no outcome are never counted as recovered revenue', () => {
    const k = computeKPIs([mkCase('N1', 1000, 'DETECTED')]);
    expect(k.totalRevenueRecoveredINR).toBe(0);
    expect(k.verifiedRecoveredINR).toBe(0);
  });
});

describe('Benchmark determinism & semantics', () => {
  const heldCompliance = (): RecoveryCase['compliance'] => ({
    approved: false, rulesPassed: [], violations: ['LIMIT'], requiresHumanApproval: true, evaluatedAt: '2026-01-01T00:00:00Z', tokensUsed: 0
  });

  it('is deterministic: identical inputs produce byte-identical output (excluding run timestamp)', () => {
    const cases: RecoveryCase[] = [
      { ...base, caseId: 'B-A', amount: 10000, eventType: 'PAYMENT_FAILED', status: 'DETECTED', compliance: heldCompliance() },
      { ...base, caseId: 'B-B', amount: 8000, eventType: 'PAYMENT_FAILED', status: 'DETECTED' }
    ];
    const r1 = BenchmarkService.runBenchmark(cases);
    const r2 = BenchmarkService.runBenchmark(cases);
    // Every computed field must be identical; only the runAt timestamp differs.
    expect(r1.baseline).toEqual(r2.baseline);
    expect(r1.agent).toEqual(r2.agent);
    expect(r1.upliftPct).toBe(r2.upliftPct);
    expect(r1.heldThoseCases).toEqual(r2.heldThoseCases);
    expect(r1.casesEvaluated).toBe(r2.casesEvaluated);
  });

  it('compliance veto reduces agent dispatches but not the naive baseline', () => {
    const cases: RecoveryCase[] = [
      { ...base, caseId: 'C-A', amount: 30000, eventType: 'PAYMENT_FAILED', status: 'DETECTED', compliance: heldCompliance() },
      { ...base, caseId: 'C-B', amount: 30000, eventType: 'PAYMENT_FAILED', status: 'DETECTED', compliance: heldCompliance() }
    ];
    const run = BenchmarkService.runBenchmark(cases, 10);
    expect(run.baseline.dispatchedCases).toBe(2);
    expect(run.agent.dispatchedCases).toBe(0);
  });

  it('settlement-guarded cases are labeled as double-charge-risk that the agent avoids', () => {
    const cases: RecoveryCase[] = [
      {
        ...base, caseId: 'S-G', amount: 5000, eventType: 'PAYMENT_FAILED', status: 'DETECTED',
        settlementGuard: { status: 'settled', blocked: true, verdict: 'PAYMENT_ALREADY_SETTLED_BLOCKED_ACTION' }
      }
    ];
    const run = BenchmarkService.runBenchmark(cases, 10);
    expect(run.agent.duplicateChargeRiskCases).toBe(0);
    // Baseline blindly dispatched; the agent held it.
    expect(run.baseline.dispatchedCases).toBe(1);
    expect(run.heldThoseCases.length).toBe(1);
    expect(run.heldThoseCases[0]).toContain('settled');
  });

  it('rules-engine ablation: shares the same compliance doubles-charge rails as the agent', () => {
    const cases: RecoveryCase[] = [
      { ...base, caseId: 'R-A', amount: 5000, eventType: 'PAYMENT_FAILED', status: 'DETECTED', compliance: heldCompliance() },
      { ...base, caseId: 'R-B', amount: 8000, eventType: 'PAYMENT_FAILED', status: 'DETECTED', settlementGuard: { status: 'settled', blocked: true, verdict: 'PAYMENT_ALREADY_SETTLED_BLOCKED_ACTION' } }
    ];
    const run = BenchmarkService.runBenchmark(cases, 10);
    // Held rules (and agent) cases are NOT dispatched by either.
    expect(run.rulesAgent.dispatchedCases).toBe(0);
    expect(run.agent.dispatchedCases).toBe(0);
    expect(run.rulesAgent.duplicateChargeRiskCases).toBe(0);
  });

  it('rules-engine ablation is deterministic and reports an AI-vs-rules delta', () => {
    const mkStrategy = (p: number): RecoveryCase['strategy'] => ({
      recommendedAction: 'PAYMENT_LINK_DISPATCH', targetChannel: 'WHATSAPP', reasoning: 't', expectedRecoveryProbability: p, calculatedIncentiveINR: 0, offeredDiscountPct: 0, delayMinutes: 0, scheduledExecutionAt: '2026-01-01T00:00:00Z', tokensUsed: 0
    });
    const cases: RecoveryCase[] = [
      { ...base, caseId: 'D-A', amount: 12000, eventType: 'PAYMENT_FAILED', status: 'DETECTED', strategy: mkStrategy(0.9) },
      { ...base, caseId: 'D-B', amount: 8000, eventType: 'PAYMENT_FAILED', status: 'DETECTED', strategy: mkStrategy(0.85) }
    ];
    const r1 = BenchmarkService.runBenchmark(cases, 10);
    const r2 = BenchmarkService.runBenchmark(cases, 10);
    expect(r1.rulesAgent).toEqual(r2.rulesAgent);
    expect(typeof r1.aiVsRulesDeltaPct).toBe('number');
    expect(r1.rulesAgent.recoveredCases).toBeGreaterThan(0);
    // With strong AI signals the AI column should dominate the static rules table.
    expect(r1.agent.netINR).toBeGreaterThan(r1.rulesAgent.netINR);
    expect(r1.aiVsRulesDeltaPct).toBeGreaterThan(0);
  });
});

describe('EV optimizer edge cases', () => {
  const strat = (p: number, incentive: number): any => ({
    action: 'SEND_TEXT_LINK', targetChannel: 'WHATSAPP', reason: 't', expectedRecoveryProbability: p, calculatedIncentiveINR: incentive, offeredDiscountPct: 0, urgency: 'NORMAL', escalationLevel: 0
  });

  it('never grants negative recovery probability', () => {
    const ev = ExpectedValueEngine.evaluate(10000, strat(-0.5, 0), 'CARD', false);
    expect(ev.successProbability).toBeGreaterThanOrEqual(0);
  });

  it('caps probability at 0.99 (no infinite-EV from overconfidence)', () => {
    const ev = ExpectedValueEngine.evaluate(10000, strat(5, 0), 'CARD', false);
    expect(ev.successProbability).toBeLessThanOrEqual(0.99);
  });

  it('an incentive larger than the amount itself yields negative EV and a REJECT', () => {
    const ev = ExpectedValueEngine.evaluate(1000, strat(0.9, 1200), 'CARD', false);
    expect(ev.expectedValueINR).toBeLessThan(0);
    expect(ev.verdict).toBe('REJECT');
  });

  it('a missing/invalid recovery probability defaults to a safe 0.5 floor, never 0 or negatives', () => {
    const ev = ExpectedValueEngine.evaluate(1000, strat(0 as any, 0), 'CARD', false);
    expect(ev.successProbability).toBe(0.5);
  });
});

describe('Financial MDR correctness', () => {
  it('UPI incurs zero MDR (RBI mandate)', () => {
    const r = FinancialAccountingEngine.calculateMDRFee(10000, 'UPI' as any);
    expect(r.totalMdrFeeINR).toBe(0);
  });

  it('domestic card 1.95% + GST = 2.301% effective', () => {
    const r = FinancialAccountingEngine.calculateMDRFee(10000, 'CARD' as any, false);
    expect(r.totalMdrFeeINR).toBeCloseTo(230.1, 0);
  });

  it('premium/corporate card selects the higher premium rail vs domestic retail', () => {
    // Compare at an amount below the >=₹25,000 premium trigger to isolate the flag.
    const premium = FinancialAccountingEngine.calculateMDRFee(10000, 'CARD' as any, true);
    const domestic = FinancialAccountingEngine.calculateMDRFee(10000, 'CARD' as any, false);
    expect(premium.totalMdrFeeINR).toBeGreaterThan(domestic.totalMdrFeeINR);
  });
});

describe('Webhook HMAC verification', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('accepts a correct HMAC-SHA256 signature', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'test_webhook_secret');
    const body = JSON.stringify({ event: 'payment.failed', id: 'evt_1' });
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', 'test_webhook_secret').update(body).digest('hex');
    expect(RazorpayService.verifyWebhookSignature(body, sig)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'test_webhook_secret');
    const body = JSON.stringify({ event: 'payment.failed', id: 'evt_1' });
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', 'test_webhook_secret').update('tampered').digest('hex');
    expect(RazorpayService.verifyWebhookSignature(body, sig)).toBe(false);
  });

  it('rejects a garbage/malformed signature without throwing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 's');
    expect(() => RazorpayService.verifyWebhookSignature('{}', 'xx')).not.toThrow();
    expect(RazorpayService.verifyWebhookSignature('{}', 'x'.repeat(200))).toBe(false);
  });
});