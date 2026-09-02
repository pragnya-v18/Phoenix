import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { RazorpayService } from '../backend/razorpay.js';
import { db } from '../backend/repositories/db.js';
import {
  handlePaymentFailed,
  handlePaymentLinkPaid,
  handlePaymentCaptured,
  handleRefundEvent
} from '../backend/webhooks/webhook-handlers.js';

// Helper factory for a minimal valid event payload
const failedPaymentEvent = (payment: any = {}) => ({
  event: 'payment.failed',
  payload: {
    payment: {
      entity: {
        id: 'pay_test_001',
        order_id: 'order_test_001',
        amount: 500000,
        currency: 'INR',
        method: 'upin',
        ...payment
      }
    }
  }
});

describe('Settlement Guard — double-charge prevention', () => {
  beforeAll(() => { db.resetForTesting(); });
  afterAll(() => { db.resetForTesting(); });

  it('blocks dispatch when the ORIGINAL payment is already settled on the gateway', async () => {
    // Force the REST check to report the original payment captured (already settled).
    const spy = vi.spyOn(RazorpayService, 'checkOriginalPaymentStatus')
      .mockResolvedValue({ status: 'settled', blocked: true, settledPaymentId: 'pay_captured_001', source: 'razorpay-rest' });

    const res = await handlePaymentFailed(failedPaymentEvent(), 'evt_1');

    expect(res.status).toBe('PAYMENT_ALREADY_SETTLED_BLOCKED_ACTION');
    expect(res.actionTaken.toLowerCase()).toContain('double-charge');

    // Case must be DISMISSED and never dispatched
    const newCase = db.getAllCases()[0];
    expect(newCase.status).toBe('DISMISSED');
    expect(newCase.settlementGuard?.blocked).toBe(true);
    expect(newCase.settlementGuard?.verdict).toBe('PAYMENT_ALREADY_SETTLED_BLOCKED_ACTION');

    spy.mockRestore();
  });

  it('falls OPEN (unverified, non-blocking) when no credentials are configured', async () => {
    const prev = { getKeyId: (RazorpayService as any).getKeyId, getKeySecret: (RazorpayService as any).getKeySecret };
    (RazorpayService as any).getKeyId = () => undefined;
    (RazorpayService as any).getKeySecret = () => undefined;

    const res = await RazorpayService.checkOriginalPaymentStatus('pay_x', 'order_x');
    expect(res.status).toBe('unverified');
    expect(res.blocked).toBe(false); // never blocks in demo/offline mode

    (RazorpayService as any).getKeyId = prev.getKeyId;
    (RazorpayService as any).getKeySecret = prev.getKeySecret;
  });
});

describe('Webhook replay & duplicate action prevention', () => {
  beforeAll(() => { db.resetForTesting(); IdempotencyReset(); });
  afterAll(() => { db.resetForTesting(); });

  it('rejects a duplicate event ID (idempotent skip)', async () => {
    const { IdempotencyService } = await import('../backend/services/idempotency.js');
    const evtId = `evt_replay_${Date.now()}`;
    const first = await IdempotencyService.tryAcquireEventLock(evtId, 86400);
    const second = await IdempotencyService.tryAcquireEventLock(evtId, 86400);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('records a campaign dispatch and then blocks a duplicate within the cooldown window', async () => {
    const { IdempotencyService } = await import('../backend/services/idempotency.js');
    IdempotencyService.resetAll();
    const key = 'cust_replay_dupe';
    await IdempotencyService.recordCustomerCampaign(key, 60);
    const check = await IdempotencyService.checkCustomerCooldown(key, 60);
    expect(check.isCoolingDown).toBe(true);
    expect(check.remainingMinutes).toBeGreaterThan(0);
  });
});

describe('Webhook settlement flows', () => {
  beforeAll(() => { db.resetForTesting(); });
  afterAll(() => { db.resetForTesting(); });

  it('AUTO_SETTLED via payment_link.paid reconciles the matched case to RECOVERED', async () => {
    // First create a case that the payment link can match against.
    const seed = {
      caseId: 'REC-WB-100',
      merchantId: 'mer_test',
      eventType: 'PAYMENT_FAILED' as const,
      status: 'EXECUTING' as const,
      amount: 5000,
      currency: 'INR',
      riskTier: 'MEDIUM' as const,
      customer: { id: 'cust_wb', name: 'A', phone: '+91 90000 00001', email: 'a@x.com', clvTier: 'GOLD' as const, historicalRecoveries: 1, totalLifetimeSpendINR: 5000 },
      sourceEvent: { paymentId: 'pay_wb_orig', orderId: 'order_wb', amount: 5000, currency: 'INR', method: 'CARD' as const, errorCode: 'X', errorDescription: 'y', occurredAt: new Date().toISOString() },
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.upsertCase(seed as any);

    const event = {
      event: 'payment_link.paid',
      payload: {
        payment: { entity: { id: 'pay_settled_1', order_id: 'order_wb' } },
        payment_link: { entity: { id: 'plink_x', notes: { caseId: 'REC-WB-100' }, amount_paid: 500000, amount: 500000, currency: 'INR', customer: {} } }
      }
    };

    const res = await handlePaymentLinkPaid(event, 'evt_settle_1');
    expect(res.status).toBe('SETTLED');
    const c = db.getCase('REC-WB-100');
    expect(c?.status).toBe('RECOVERED');
    expect(c?.outcome?.reconciliationMethod).toBe('PAYMENT_LINK_PAID_WEBHOOK');
    // This is a verified (webhook) reconciliation — fed into verified revenue.
    expect(c?.outcome?.recoveredAmount).toBe(5000);
  });

  it('AUTO_SETTLED via payment.captured reconciles to RECOVERED with PAYMENT_CAPTURED_WEBHOOK', async () => {
    await db.upsertCase({
      caseId: 'REC-WB-200',
      merchantId: 'mer_test',
      eventType: 'PAYMENT_FAILED' as const,
      status: 'EXECUTING' as const,
      amount: 3000,
      currency: 'INR',
      riskTier: 'MEDIUM' as const,
      customer: { id: 'cust_wb2', name: 'B', phone: '+91 90000 00002', email: 'b@x.com', clvTier: 'SILVER' as const, historicalRecoveries: 0, totalLifetimeSpendINR: 3000 },
      sourceEvent: { paymentId: 'pay_cap_orig', orderId: 'order_cap', amount: 3000, currency: 'INR', method: 'UPI' as const, errorCode: 'X', errorDescription: 'y', occurredAt: new Date().toISOString() },
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);

    const event = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_cap_orig', order_id: 'order_cap', amount: 300000, method: 'UPI' } } }
    };

    const res = await handlePaymentCaptured(event, 'evt_cap_1');
    expect(res.status).toBe('SETTLED');
    expect(db.getCase('REC-WB-200')?.outcome?.reconciliationMethod).toBe('PAYMENT_CAPTURED_WEBHOOK');
  });

  it('dead-letters a payment_link.paid that matches no known case', async () => {
    // No case matches plink_unknown.
    const event = {
      event: 'payment_link.paid',
      payload: {
        payment: { entity: { id: 'pay_unknown', order_id: 'order_unknown' } },
        payment_link: { entity: { id: 'plink_unknown', notes: {}, amount_paid: 100000, amount: 100000, currency: 'INR', customer: {} } }
      }
    };
    const res = await handlePaymentLinkPaid(event, 'evt_dl_1');
    expect(res.status).toBe('DEAD_LETTER');
    expect(db.getDeadLetterPayments().length).toBeGreaterThan(0);
  });
});

// Small local helper to keep the file self-contained.
async function IdempotencyReset() {
  const { IdempotencyService } = await import('../backend/services/idempotency.js');
  IdempotencyService.resetAll();
}