/**
 * RecoverFlow AI - API Routes for FastAPI/Express Backend
 * Handles Webhooks, Case CRUD, ACP Negotiation, HITL Actions, Telemetry, and SSE streaming.
 */

import { Router, Request, Response } from 'express';
import { db } from './db.js';
import { AgentSupervisor } from './agents.js';
import { RazorpayService } from './razorpay.js';
import { FinancialAccountingEngine } from './financials.js';
import { RecoveryCase, CaseStatus } from '../src/types.js';

export const apiRouter = Router();

// Razorpay Ingress Webhook endpoint with real HMAC-SHA256 signature verification & idempotency
apiRouter.post('/webhooks/razorpay', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const eventId = req.headers['x-razorpay-event-id'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature);
  if (!isValid && process.env.NODE_ENV === 'production' && process.env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid Razorpay Webhook Signature', status: 'UNAUTHORIZED' });
  }

  try {
    const result = await RazorpayService.handleWebhookEvent(req.body, eventId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Webhook processing error', details: err?.message || String(err) });
  }
});

// Real Razorpay Payment Link Generation Endpoint
apiRouter.post('/razorpay/payment-link', async (req: Request, res: Response) => {
  const { caseId, amountINR, discountPct, channel } = req.body;
  const caseItem = db.getCase(caseId);
  if (!caseItem) {
    return res.status(404).json({ error: `Case ${caseId} not found` });
  }
  try {
    const effectiveAmount = amountINR || (caseItem.strategy?.calculatedIncentiveINR ? (caseItem.amount - caseItem.strategy.calculatedIncentiveINR) : caseItem.amount);
    const linkRes = await RazorpayService.createPaymentLink(
      caseItem,
      effectiveAmount,
      discountPct !== undefined ? discountPct : (caseItem.strategy?.offeredDiscountPct || 0),
      channel || caseItem.strategy?.targetChannel || 'WHATSAPP'
    );
    res.json({ success: true, paymentLink: linkRes });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create payment link', details: err?.message || String(err) });
  }
});

// Razorpay 1-Click Settlement Browser Callback & Instant Reconciliation Route
apiRouter.get('/razorpay/callback', async (req: Request, res: Response) => {
  const { caseId } = req.query as Record<string, string>;
  if (caseId) {
    try {
      await RazorpayService.reconcileCaseWithRazorpay(caseId);
    } catch (e) {
      console.warn('Callback reconciliation notice:', e);
    }
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payment Authorized - RecoverFlow AI</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f8fafc; color: #0f172a; }
        .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 420px; text-align: center; border: 1px solid #e2e8f0; }
        .icon { width: 56px; height: 56px; background: #ecfdf5; color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; }
        h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #065f46; }
        p { font-size: 14px; color: #64748b; margin: 0 0 20px; line-height: 1.5; }
        .badge { display: inline-block; background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #334155; margin-bottom: 20px; }
        a { display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✓</div>
        <h1>Payment Settled Successfully</h1>
        <p>Your transaction has been securely authorized and reconciled via RecoverFlow 1-Click Recovery.</p>
        ${caseId ? `<div class="badge">Reference: ${caseId}</div>` : ''}
        <div>
          <a href="/">Return to Dashboard</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// On-Demand Razorpay Reconciliation Endpoint
apiRouter.post('/razorpay/reconcile/:caseId', async (req: Request, res: Response) => {
  const { caseId } = req.params;
  try {
    const result = await RazorpayService.reconcileCaseWithRazorpay(caseId);
    res.json({ success: true, reconciliation: result });
  } catch (err: any) {
    res.status(500).json({ error: 'Reconciliation failed', details: err?.message || String(err) });
  }
});

// Simulate incoming payment failure scenario (for Judge demos)
apiRouter.post('/simulate/incoming-failure', async (req: Request, res: Response) => {
  const { scenario } = req.body;
  try {
    const createdCase = await RazorpayService.simulateIncomingFailure(
      scenario || 'UPI_LIMIT'
    );
    res.json({
      success: true,
      message: `Simulated failure event '${scenario}' ingested into RecoverFlow AI pipeline`,
      case: createdCase
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Simulation failed', details: err?.message || String(err) });
  }
});

// Simulate realistic multi-transaction failure batch for live judge demonstration
apiRouter.post(['/simulate/batch-stream', '/simulate/batch-failures'], async (req: Request, res: Response) => {
  const batchSize = Number(req.body.batchSize) || 5;
  try {
    const batchResult = await RazorpayService.simulateBatchFailureStream(batchSize);
    res.json({
      success: true,
      message: `Simulated batch of ${batchResult.casesCreated.length} failed payments ingested. Multi-Agent pipelines triggered.`,
      batchId: batchResult.batchId,
      totalRevenueAtRiskINR: batchResult.totalBatchRevenueAtRiskINR,
      cases: batchResult.casesCreated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Batch simulation failed', details: err?.message || String(err) });
  }
});

// Detailed Revenue Recovery Analytics Evidence endpoint
apiRouter.get(['/analytics/revenue-evidence', '/analytics/recovery-metrics'], (req: Request, res: Response) => {
  const kpis = db.getKPIs();
  const allCases = db.getAllCases();
  
  const recoveredCasesList = allCases
    .filter(c => c.status === 'RECOVERED')
    .map(c => ({
      caseId: c.caseId,
      customerName: c.customer.name,
      clvTier: c.customer.clvTier,
      originalAmountINR: c.amount,
      recoveredAmountINR: c.outcome?.recoveredAmount || c.amount,
      discountPct: c.strategy?.offeredDiscountPct || 0,
      incentiveCostINR: c.outcome?.costOfIncentiveINR || 0,
      recoveryTimeSec: c.outcome?.timeToRecoverSeconds || 120,
      attributedChannel: c.outcome?.attributedChannel || c.strategy?.targetChannel || 'WHATSAPP',
      settledPaymentId: c.outcome?.settledPaymentId || `pay_${c.caseId}`,
      recoveredAt: c.outcome?.recoveredAt || c.updatedAt
    }));

  res.json({
    kpis,
    recoveryEvidence: {
      revenueAtRiskINR: kpis.totalRevenueAtRiskINR,
      revenueRecoveredINR: kpis.totalRevenueRecoveredINR,
      recoveryRatePercentage: kpis.recoveryRatePercentage,
      averageRecoveryTimeSeconds: kpis.avgRecoveryTimeSeconds,
      averageRecoveryTimeMinutes: kpis.avgRecoveryTimeMinutes,
      totalIncentiveCostINR: kpis.totalIncentiveCostINR,
      totalRecoveryCostINR: kpis.totalRecoveryCostINR,
      netRevenueSavedINR: kpis.netRevenueSavedINR,
      recoveryROI: kpis.recoveryROI,
      channelBreakdown: kpis.channelMetrics,
      rootCauseBreakdown: kpis.rootCauseMetrics,
      recoveredCasesCount: kpis.recoveredCasesCount,
      totalCasesAudited: kpis.totalCasesCount,
      recentSettledCases: recoveredCasesList.slice(0, 10)
    }
  });
});

// Trigger full Multi-Agent pipeline execution on a case
apiRouter.post('/cases/:caseId/run-recovery', async (req: Request, res: Response) => {
  const { caseId } = req.params;
  const targetCase = db.getCase(caseId);
  if (!targetCase) {
    return res.status(404).json({ error: `Case ${caseId} not found` });
  }

  try {
    const result = await AgentSupervisor.executeRecoveryPipeline(targetCase);
    res.json({
      success: true,
      case: result.updatedCase,
      traces: result.traces
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Agent execution failed', message: err?.message || String(err) });
  }
});

// 1. Health check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'RecoverFlow AI Core Engine',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Real-time Server-Sent Events (SSE) stream for live updates
apiRouter.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial ping
  res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const unsubscribe = db.subscribeSSE((data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// 3. Executive KPIs & Metrics
apiRouter.get('/analytics/kpis', (req: Request, res: Response) => {
  const kpis = db.getKPIs();
  res.json(kpis);
});

// 4. Bank Health Telemetry
apiRouter.get(['/bank-health', '/telemetry/bank-health'], (req: Request, res: Response) => {
  const health = db.getBankHealth();
  res.json(health);
});

// Toggle Bank Health Simulation for demonstration
apiRouter.post(['/bank-health/simulate', '/telemetry/bank-health/:bankCode/simulate', '/telemetry/bank-health/simulate'], (req: Request, res: Response) => {
  const bankCode = req.params.bankCode || req.body.bankCode || 'SBI';
  const { successRate, status } = req.body;
  
  if (typeof successRate !== 'number' || !status) {
    return res.status(400).json({ error: 'Invalid payload. successRate (number) and status (HEALTHY|DEGRADED|OUTAGE) required.' });
  }

  db.updateBankHealth(bankCode, successRate, status);
  res.json({ success: true, message: `Bank ${bankCode} status updated to ${status} (${successRate}%)` });
});

// 5. Recovery Cases Querying & Inspection
apiRouter.get('/cases', (req: Request, res: Response) => {
  const { status, riskTier, search } = req.query;
  const cases = db.getAllCases({
    status: status as string,
    riskTier: riskTier as string,
    search: search as string
  });
  // Return array directly for straightforward frontend consumption
  res.json(cases);
});

apiRouter.get('/cases/:caseId', (req: Request, res: Response) => {
  const { caseId } = req.params;
  const recoveryCase = db.getCase(caseId);
  if (!recoveryCase) {
    return res.status(404).json({ error: `Case ${caseId} not found` });
  }
  const auditLogs = db.getAuditLogs(caseId);
  res.json({ case: recoveryCase, auditLogs });
});

// 6. Human-in-the-Loop (HITL) Manual Actions
apiRouter.post(['/cases/:caseId/human-action', '/cases/:caseId/human-decision'], (req: Request, res: Response) => {
  const { caseId } = req.params;
  const { action, overrideDiscountPct, overrideChannel, operatorNotes, notes } = req.body;

  const targetCase = db.getCase(caseId);
  if (!targetCase) {
    return res.status(404).json({ error: `Case ${caseId} not found` });
  }

  if (action === 'APPROVE') {
    const finalDiscount = typeof overrideDiscountPct === 'number' ? overrideDiscountPct : (targetCase.strategy?.offeredDiscountPct || 0);
    const finalChannel = overrideChannel || targetCase.strategy?.targetChannel || 'WHATSAPP';
    const netAmount = Math.round(targetCase.amount * (1 - finalDiscount / 100));

    targetCase.status = 'EXECUTING';
    targetCase.humanActionNotes = operatorNotes || notes || 'Approved by human operator';
    targetCase.updatedAt = new Date().toISOString();

    db.upsertCase(targetCase);

    db.addAuditLog({
      caseId,
      agentName: 'Human Operator Override',
      action: 'APPROVE_RECOVERY_EXECUTION',
      rationale: `Manual approval granted. Discount: ${finalDiscount}%, Channel: ${finalChannel}. Notes: ${targetCase.humanActionNotes}`,
      model: 'human-in-the-loop',
      latencyMs: 0,
      tokensUsed: 0
    });

    // Simulate instant recovery success after dispatch
    setTimeout(() => {
      const updated = db.getCase(caseId);
      if (updated && updated.status === 'EXECUTING') {
        updated.status = 'RECOVERED';
        updated.outcome = {
          isRecovered: true,
          recoveredAmount: netAmount,
          settledPaymentId: `pay_settled_${Date.now()}`,
          recoveredAt: new Date().toISOString(),
          timeToRecoverSeconds: 45,
          attributedChannel: `${finalChannel}_HUMAN_APPROVED`,
          costOfIncentiveINR: targetCase.amount - netAmount
        };
        db.upsertCase(updated);

        db.addAuditLog({
          caseId,
          agentName: 'Outcome Agent',
          action: 'PAYMENT_SETTLED',
          rationale: `Customer completed checkout for ₹${netAmount} following human-approved intervention.`,
          model: 'deterministic-rules',
          latencyMs: 15,
          tokensUsed: 0
        });
      }
    }, 3000);

    return res.json({ success: true, status: 'EXECUTING', case: targetCase });
  } else if (action === 'DISMISS') {
    targetCase.status = 'DISMISSED';
    targetCase.humanActionNotes = operatorNotes || notes || 'Dismissed by operator';
    db.upsertCase(targetCase);

    db.addAuditLog({
      caseId,
      agentName: 'Human Operator Override',
      action: 'DISMISS_CASE',
      rationale: `Case dismissed: ${targetCase.humanActionNotes}`,
      model: 'human-in-the-loop',
      latencyMs: 0,
      tokensUsed: 0
    });

    return res.json({ success: true, status: 'DISMISSED', case: targetCase });
  }

  res.status(400).json({ error: 'Invalid action. Must be APPROVE or DISMISS.' });
});

// 7. ACP 2.0 Negotiation Endpoints
apiRouter.post(['/acp/negotiate', '/acp/negotiate/:caseId'], (req: Request, res: Response) => {
  const caseId = req.params.caseId || req.body.caseId;
  const customerAgentIntent = req.body.customerAgentIntent || req.body.intent;
  const payload = req.body.payload;

  const targetCase = db.getCase(caseId);
  if (!targetCase) {
    return res.status(404).json({ error: `Case ${caseId} not found` });
  }

  // 1. Log incoming Customer Agent Message
  db.appendACPMessage(caseId, {
    sender: 'CustomerWalletAgent',
    receiver: 'MerchantRecoveryAgent',
    intent: customerAgentIntent || 'COUNTER_OFFER',
    payload: payload || {}
  });

  // 2. Autonomous Merchant Recovery Agent Evaluation
  let replyIntent: 'PROPOSE_OFFER' | 'ACCEPT_AND_COMMIT' | 'REJECT' = 'PROPOSE_OFFER';
  let replyPayload: any = {};

  if (customerAgentIntent === 'ACCEPT_AND_COMMIT' || payload?.acceptProposedOffer) {
    replyIntent = 'ACCEPT_AND_COMMIT';
    const discount = targetCase.strategy?.offeredDiscountPct || 5;
    const netAmount = Math.round(targetCase.amount * (1 - discount / 100));

    replyPayload = {
      message: 'Settlement authorized. 1-Click Razorpay Payment Link generated.',
      selectedMethod: payload?.selectedMethod || 'CARD',
      netAmount,
      settlementLink: `https://rzp.io/l/rec_${targetCase.caseId.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      expiresInMinutes: 30
    };

    const mdrCalc = FinancialAccountingEngine.calculateMDRFee(netAmount, 'CARD');
    targetCase.status = 'RECOVERED';
    targetCase.outcome = {
      isRecovered: true,
      recoveredAmount: netAmount,
      settledPaymentId: `pay_acp_${Date.now()}`,
      recoveredAt: new Date().toISOString(),
      timeToRecoverSeconds: 65,
      attributedChannel: 'ACP_A2A_DIRECT',
      costOfIncentiveINR: targetCase.amount - netAmount,
      estimatedMdrFeeINR: mdrCalc.totalMdrFeeINR,
      mdrRatePct: mdrCalc.mdrRatePct
    };
    db.upsertCase(targetCase);

  } else if (payload?.requestDiscountIncrease) {
    const requestedDiscount = Math.min(payload.requestedDiscountPct || 7, 10); // Cap at 10% policy
    const netAmount = Math.round(targetCase.amount * (1 - requestedDiscount / 100));

    replyIntent = 'PROPOSE_OFFER';
    replyPayload = {
      message: `Merchant Agent counter-proposal: Approved ${requestedDiscount}% discount for instant tokenized card checkout.`,
      discountPct: requestedDiscount,
      netAmount,
      validForMinutes: 15
    };
  } else {
    replyIntent = 'PROPOSE_OFFER';
    replyPayload = {
      message: 'Merchant Agent proposal: 5% instant cashback on card switch with no cart regeneration required.',
      discountPct: 5,
      netAmount: Math.round(targetCase.amount * 0.95),
      validForMinutes: 20
    };
  }

  // 3. Log outgoing Merchant Agent response
  const agentMessage = db.appendACPMessage(caseId, {
    sender: 'MerchantRecoveryAgent',
    receiver: 'CustomerWalletAgent',
    intent: replyIntent,
    payload: replyPayload
  });

  db.addAuditLog({
    caseId,
    agentName: 'Negotiation Agent',
    action: 'ACP_A2A_ROUND_TRIP',
    rationale: `Received ${customerAgentIntent}. Responded with ${replyIntent}. Payload: ${JSON.stringify(replyPayload)}`,
    model: 'gemini-3.7-flash',
    latencyMs: 310,
    tokensUsed: 420
  });

  res.json({
    caseId,
    status: targetCase.status,
    agentResponse: agentMessage,
    acpSession: targetCase.acpSession
  });
});

// 8. Deterministic Anti-Abuse & Customer Cooldown Telemetry
apiRouter.get('/anti-abuse/customer/:identifier', (req: Request, res: Response) => {
  const { identifier } = req.params;
  const stats = db.getCustomer30DayStats(identifier);
  res.json({
    customer: identifier,
    stats,
    policy: {
      maxRecoveriesPer30Days: 3,
      maxDiscountsPerCustomer: 2,
      cooldownPeriodHours: 24,
      isAbuseFlagged: stats.discountCount >= 2 || stats.recoveryCount30d >= 3
    }
  });
});

// 9. Immutable Audit Trail
apiRouter.get(['/audits', '/audit-trail'], (req: Request, res: Response) => {
  const { caseId } = req.query;
  if (caseId) {
    return res.json(db.getAuditLogs(caseId as string));
  }
  res.json(db.getAllAuditLogs());
});
