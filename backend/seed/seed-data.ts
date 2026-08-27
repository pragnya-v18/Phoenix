/**
 * RecoverFlow AI - Seed Data
 * Generates demonstration cases and audit logs for development mode.
 * Extracted from FirestoreDatabase for modularity.
 */

import crypto from 'crypto';
import { RecoveryCase, AuditLogEntry, BankHealthMetric } from '../../src/types/index.js';

export interface SeedData {
  bankHealth: BankHealthMetric[];
  cases: RecoveryCase[];
  auditLogs: AuditLogEntry[];
}

export function generateSeedData(): SeedData {
  // 1. Bank Switches
  const bankHealth: BankHealthMetric[] = [
    { bankCode: 'HDFC', name: 'HDFC Bank Ltd', networkType: 'UPI & Netbanking', rollingSuccessRatePct: 94.8, status: 'HEALTHY', sampleCountLast15Min: 2840, latencyMs: 180, lastUpdated: new Date().toISOString() },
    { bankCode: 'SBI', name: 'State Bank of India', networkType: 'UPI Switch Core', rollingSuccessRatePct: 68.2, status: 'DEGRADED', sampleCountLast15Min: 4120, latencyMs: 890, lastUpdated: new Date().toISOString() },
    { bankCode: 'ICICI', name: 'ICICI Bank Ltd', networkType: 'UPI & IMPS Rail', rollingSuccessRatePct: 96.1, status: 'HEALTHY', sampleCountLast15Min: 1980, latencyMs: 150, lastUpdated: new Date().toISOString() },
    { bankCode: 'AXIS', name: 'Axis Bank Ltd', networkType: 'UPI & Card Gateway', rollingSuccessRatePct: 92.4, status: 'HEALTHY', sampleCountLast15Min: 1510, latencyMs: 210, lastUpdated: new Date().toISOString() },
    { bankCode: 'NPCI_UPI', name: 'NPCI Unified Payments Hub', networkType: 'National Switch', rollingSuccessRatePct: 89.5, status: 'HEALTHY', sampleCountLast15Min: 18450, latencyMs: 340, lastUpdated: new Date().toISOString() }
  ];

  // 2. Demonstration Cases
  const cases: RecoveryCase[] = [
    {
      caseId: 'REC-2026-881',
      merchantId: 'mer_razorpay_demo',
      eventType: 'PAYMENT_FAILED',
      status: 'RECOVERED',
      amount: 4999.00,
      currency: 'INR',
      riskTier: 'HIGH',
      customer: { id: 'cust_9812', name: 'Aarav Sharma', phone: '+91 98765 43210', email: 'aarav.sharma@example.com', clvTier: 'PLATINUM', historicalRecoveries: 3, totalLifetimeSpendINR: 84000 },
      sourceEvent: { paymentId: 'pay_Kx9281aZ01', orderId: 'order_Kx881290aa', amount: 4999.00, currency: 'INR', method: 'UPI', errorCode: 'BAD_REQUEST_ERROR', errorDescription: 'Payment failed due to single-transaction UPI ticket limit on HDFC Bank handle', occurredAt: new Date(Date.now() - 3600000).toISOString(), bankCode: 'HDFC' },
      diagnosis: { rootCauseCategory: 'LIMIT_EXCEEDED', rootCauseDetail: 'Customer exceeded single-transaction UPI ticket limit on HDFC Bank handle.', confidenceScore: 0.94, isTransient: false, bankCode: 'HDFC', bankSwitchHealthIndex: 94.8, recommendedRailSwitch: 'CARD', diagnosedAt: new Date(Date.now() - 3590000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'ACP_A2A_OFFER', targetChannel: 'WHATSAPP', offeredDiscountPct: 5.0, calculatedIncentiveINR: 249.95, delayMinutes: 0, reasoning: 'High-value Platinum user facing single-transaction UPI limit. Proposed instant 5% cashback on tokenized Visa card checkout.', expectedRecoveryProbability: 0.91, scheduledExecutionAt: new Date(Date.now() - 3580000).toISOString(), tokensUsed: 0 },
      acpSession: {
        sessionId: 'acp_sess_881', status: 'ACCEPTED', protocolVersion: 'ACP/2.0',
        dialogue: [
          { id: 'msg_01', sender: 'MerchantRecoveryAgent', receiver: 'CustomerWalletAgent', intent: 'PROPOSE_OFFER', payload: { discountPct: 5.0, netAmount: 4749.05, selectedMethod: 'CARD', message: 'Offer 5% discount for instant Card checkout without cart regeneration' }, timestamp: new Date(Date.now() - 3570000).toISOString() },
          { id: 'msg_02', sender: 'CustomerWalletAgent', receiver: 'MerchantRecoveryAgent', intent: 'ACCEPT_AND_COMMIT', payload: { selectedMethod: 'CARD', cardLast4: '4012', consentToken: 'cst_tok_99182', message: 'Customer authorized switch to Visa ending 4012' }, timestamp: new Date(Date.now() - 3540000).toISOString() }
        ]
      },
      compliance: { approved: true, rulesPassed: ['TRAI_QUIET_HOURS_OK', 'MAX_DISCOUNT_WITHIN_CAP', 'COMMUNICATION_FATIGUE_OK'], violations: [], requiresHumanApproval: false, evaluatedAt: new Date(Date.now() - 3530000).toISOString(), tokensUsed: 0 },
      outcome: { isRecovered: true, recoveredAmount: 4749.05, settledPaymentId: 'pay_Ky9912bZ99', recoveredAt: new Date(Date.now() - 3450000).toISOString(), timeToRecoverSeconds: 150, attributedChannel: 'WHATSAPP_ACP_LINK', costOfIncentiveINR: 249.95 },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3450000).toISOString()
    },
    {
      caseId: 'REC-2026-882',
      merchantId: 'mer_razorpay_demo',
      eventType: 'PAYMENT_FAILED',
      status: 'PENDING_APPROVAL',
      amount: 48500.00,
      currency: 'INR',
      riskTier: 'CRITICAL',
      customer: { id: 'cust_4419', name: 'Priya Mehra (Enterprise Lead)', phone: '+91 98231 11223', email: 'priya@techcorp.in', clvTier: 'PLATINUM', historicalRecoveries: 1, totalLifetimeSpendINR: 290000 },
      sourceEvent: { paymentId: 'pay_Lx99321b02', orderId: 'order_Lx119283bb', amount: 48500.00, currency: 'INR', method: 'NETBANKING', errorCode: 'GATEWAY_ERROR', errorDescription: 'Payment authorization timed out on SBI corporate banking portal', occurredAt: new Date(Date.now() - 1800000).toISOString(), bankCode: 'SBI' },
      diagnosis: { rootCauseCategory: 'ISSUER_DOWNTIME', rootCauseDetail: 'SBI Corporate Banking switch is currently degraded (Success rate 68.2%).', confidenceScore: 0.96, isTransient: true, bankCode: 'SBI', bankSwitchHealthIndex: 68.2, recommendedRailSwitch: 'CARD', diagnosedAt: new Date(Date.now() - 1790000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'ACP_A2A_OFFER', targetChannel: 'WHATSAPP', offeredDiscountPct: 8.0, calculatedIncentiveINR: 3880.00, delayMinutes: 15, reasoning: 'High-value enterprise order (₹48,500). System flagged for Human Approval due to transaction value exceeding ₹25,000 threshold.', expectedRecoveryProbability: 0.85, scheduledExecutionAt: new Date(Date.now() - 1780000).toISOString(), tokensUsed: 0 },
      compliance: { approved: false, rulesPassed: ['TRAI_QUIET_HOURS_OK'], violations: ['TRANSACTION_EXCEEDS_AUTO_APPROVAL_THRESHOLD (₹48,500 > ₹25,000)'], requiresHumanApproval: true, evaluatedAt: new Date(Date.now() - 1770000).toISOString(), tokensUsed: 0 },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1770000).toISOString()
    },
    {
      caseId: 'REC-2026-883',
      merchantId: 'mer_razorpay_demo',
      eventType: 'SUBSCRIPTION_HALTED',
      status: 'NEGOTIATING',
      amount: 1499.00,
      currency: 'INR',
      riskTier: 'MEDIUM',
      customer: { id: 'cust_2209', name: 'Rohan Deshmukh', phone: '+91 97654 33211', email: 'rohan.d@gmail.com', clvTier: 'GOLD', historicalRecoveries: 0, totalLifetimeSpendINR: 17988 },
      sourceEvent: { subscriptionId: 'sub_Nx881723cc', amount: 1499.00, currency: 'INR', method: 'NACH_MANDATE', errorCode: 'MANDATE_INVALID', errorDescription: 'Recurring auto-debit failed: e-Mandate registration expired or revoked', occurredAt: new Date(Date.now() - 900000).toISOString(), bankCode: 'ICICI' },
      diagnosis: { rootCauseCategory: 'MANDATE_EXPIRED', rootCauseDetail: 'Customer e-Mandate expired at issuing bank. Requires tokenized card mandate renewal.', confidenceScore: 0.98, isTransient: false, bankCode: 'ICICI', bankSwitchHealthIndex: 96.1, recommendedRailSwitch: 'CARD', diagnosedAt: new Date(Date.now() - 890000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'ACP_A2A_OFFER', targetChannel: 'WHATSAPP', offeredDiscountPct: 0.0, calculatedIncentiveINR: 0.0, delayMinutes: 0, reasoning: 'Recurring subscription mandate renewal required. ACP agent dispatches instant 1-click token authorization link.', expectedRecoveryProbability: 0.88, scheduledExecutionAt: new Date(Date.now() - 880000).toISOString(), tokensUsed: 0 },
      acpSession: {
        sessionId: 'acp_sess_883', status: 'PROPOSED', protocolVersion: 'ACP/2.0',
        dialogue: [{ id: 'msg_883_01', sender: 'MerchantRecoveryAgent', receiver: 'CustomerWalletAgent', intent: 'PROPOSE_OFFER', payload: { message: 'Subscription auto-debit expired. Renew UPI AutoPay or Tokenized Card with 1 click to prevent service interruption.', netAmount: 1499.00 }, timestamp: new Date(Date.now() - 870000).toISOString() }]
      },
      compliance: { approved: true, rulesPassed: ['TRAI_QUIET_HOURS_OK', 'FREQUENCY_LIMIT_OK'], violations: [], requiresHumanApproval: false, evaluatedAt: new Date(Date.now() - 860000).toISOString(), tokensUsed: 0 },
      createdAt: new Date(Date.now() - 900000).toISOString(),
      updatedAt: new Date(Date.now() - 860000).toISOString()
    },
    // 2b. Checkout Abandonment Cases
    {
      caseId: 'REC-CO-881',
      merchantId: 'mer_razorpay_demo',
      eventType: 'CHECKOUT_ABANDONED',
      status: 'RECOVERED',
      amount: 7499.00,
      currency: 'INR',
      riskTier: 'HIGH',
      customer: { id: 'cust_co_881', name: 'Ananya Krishnamurthy', phone: '+91 98456 78901', email: 'ananya.k@example.com', clvTier: 'GOLD', historicalRecoveries: 1, totalLifetimeSpendINR: 52000 },
      sourceEvent: { orderId: 'order_co_881', amount: 7499.00, currency: 'INR', method: 'UPI', errorCode: 'CHECKOUT_ABANDONED', errorDescription: 'Customer abandoned checkout at payment authorization stage after 8 min 42 sec session', occurredAt: new Date(Date.now() - 1800000).toISOString(), bankCode: 'HDFC' },
      checkoutProfile: { checkoutId: 'chk_881_krishnamurthy', sessionId: 'sess_co_881', abandonedAt: new Date(Date.now() - 1800000).toISOString(), lastActivityAt: new Date(Date.now() - 1800000).toISOString(), stageReached: 'PAYMENT_AUTHORIZATION', cartValueINR: 7499.00, cartItems: [{ name: 'Premium Wireless Headphones', quantity: 1, priceINR: 4999 }, { name: 'Carrying Case', quantity: 1, priceINR: 1500 }, { name: 'Extended Warranty', quantity: 1, priceINR: 1000 }], totalCartItems: 3, deviceType: 'mobile', browserSessionDurationSec: 522, previousVisitCount: 3, recoveryProbability: 0.78 },
      diagnosis: { rootCauseCategory: 'CHECKOUT_STALL', rootCauseDetail: 'Customer stalled at UPI payment authorization for 8+ minutes on mobile device.', confidenceScore: 0.91, isTransient: false, bankCode: 'HDFC', bankSwitchHealthIndex: 94.8, recommendedRailSwitch: 'CARD', diagnosedAt: new Date(Date.now() - 1790000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'PAYMENT_LINK_DISPATCH', targetChannel: 'WHATSAPP', offeredDiscountPct: 3.0, calculatedIncentiveINR: 224.97, delayMinutes: 0, reasoning: 'High cart value (₹7,499) with 3-item basket and Gold CLV tier. Recovery probability 78%.', expectedRecoveryProbability: 0.82, scheduledExecutionAt: new Date(Date.now() - 1780000).toISOString(), tokensUsed: 0 },
      compliance: { approved: true, rulesPassed: ['TRAI_QUIET_HOURS_OK', 'MAX_DISCOUNT_WITHIN_CAP', 'CHECKOUT_RECOVERY_AUTHORIZED'], violations: [], requiresHumanApproval: false, evaluatedAt: new Date(Date.now() - 1770000).toISOString(), tokensUsed: 0 },
      outcome: { isRecovered: true, recoveredAmount: 7274.03, settledPaymentId: 'pay_co_881_settled', paymentLinkId: 'plink_co_881', reconciliationMethod: 'PAYMENT_LINK_PAID_WEBHOOK', recoveredAt: new Date(Date.now() - 1620000).toISOString(), timeToRecoverSeconds: 180, attributedChannel: 'WHATSAPP_PAYMENT_LINK', costOfIncentiveINR: 224.97, estimatedMdrFeeINR: 138.32, mdrRatePct: 1.9, businessInsights: 'Recovered ₹7,274 from abandoned 3-item cart via WhatsApp payment link with 3% incentive.' },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1620000).toISOString()
    },
    {
      caseId: 'REC-CO-882',
      merchantId: 'mer_razorpay_demo',
      eventType: 'CHECKOUT_ABANDONED',
      status: 'EXECUTING',
      amount: 24999.00,
      currency: 'INR',
      riskTier: 'CRITICAL',
      customer: { id: 'cust_co_882', name: 'Rajeev Menon', phone: '+91 98200 55667', email: 'rajeev.m@enterprise.in', clvTier: 'PLATINUM', historicalRecoveries: 0, totalLifetimeSpendINR: 320000 },
      sourceEvent: { orderId: 'order_co_882', amount: 24999.00, currency: 'INR', method: 'CARD', errorCode: 'CHECKOUT_ABANDONED', errorDescription: 'Enterprise customer abandoned checkout at OTP entry stage after 4 min 15 sec session', occurredAt: new Date(Date.now() - 960000).toISOString(), bankCode: 'ICICI' },
      checkoutProfile: { checkoutId: 'chk_882_menon', sessionId: 'sess_co_882', abandonedAt: new Date(Date.now() - 960000).toISOString(), lastActivityAt: new Date(Date.now() - 960000).toISOString(), stageReached: 'OTP_ENTRY', cartValueINR: 24999.00, cartItems: [{ name: 'Enterprise SaaS Annual License', quantity: 1, priceINR: 19999 }, { name: 'Premium Support Add-on', quantity: 1, priceINR: 5000 }], totalCartItems: 2, deviceType: 'desktop', browserSessionDurationSec: 255, previousVisitCount: 5, recoveryProbability: 0.85 },
      diagnosis: { rootCauseCategory: 'CHECKOUT_SESSION_EXPIRED', rootCauseDetail: 'Customer abandoned at OTP entry stage — likely session timeout or OTP delivery delay.', confidenceScore: 0.93, isTransient: true, bankCode: 'ICICI', bankSwitchHealthIndex: 96.1, recommendedRailSwitch: 'CARD', diagnosedAt: new Date(Date.now() - 950000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'ACP_A2A_OFFER', targetChannel: 'WHATSAPP', offeredDiscountPct: 0.0, calculatedIncentiveINR: 0.0, delayMinutes: 0, reasoning: 'Platinum enterprise customer with 5 prior visits and ₹3.2L lifetime spend. High intent — no discount needed.', expectedRecoveryProbability: 0.87, scheduledExecutionAt: new Date(Date.now() - 940000).toISOString(), tokensUsed: 0 },
      compliance: { approved: true, rulesPassed: ['TRAI_QUIET_HOURS_OK', 'CHECKOUT_RECOVERY_AUTHORIZED'], violations: [], requiresHumanApproval: false, evaluatedAt: new Date(Date.now() - 930000).toISOString(), tokensUsed: 0 },
      createdAt: new Date(Date.now() - 960000).toISOString(),
      updatedAt: new Date(Date.now() - 930000).toISOString()
    },
    // 2c. B2B Receivables Invoice Cases
    {
      caseId: 'REC-INV-881',
      merchantId: 'mer_razorpay_demo',
      eventType: 'INVOICE_OVERDUE',
      status: 'RECOVERED',
      amount: 185000.00,
      currency: 'INR',
      riskTier: 'CRITICAL',
      customer: { id: 'cust_inv_881', name: 'Vikram Patel', phone: '+91 98201 22334', email: 'vikram.patel@techsolutions.in', clvTier: 'PLATINUM', historicalRecoveries: 2, totalLifetimeSpendINR: 4200000 },
      sourceEvent: { invoiceId: 'inv_ts_881', amount: 185000.00, currency: 'INR', method: 'NETBANKING', errorCode: 'INVOICE_OVERDUE', errorDescription: 'Invoice INV-2026-TS-441 overdue by 45 days.', occurredAt: new Date(Date.now() - 3888000000).toISOString(), bankCode: 'HDFC' },
      invoiceProfile: { invoiceId: 'inv_ts_881', invoiceNumber: 'INV-2026-TS-441', invoiceDate: new Date(Date.now() - 3888000000).toISOString(), dueDate: new Date(Date.now() - 1296000000).toISOString(), daysPastDue: 45, dpdBucket: 'OVERDUE_60', outstandingAmountINR: 185000.00, originalAmountINR: 185000.00, paymentTerms: 'NET_30', companyName: 'TechSolutions India Pvt Ltd', companyGstin: '27AABCT1234F1Z5', contactPerson: 'Vikram Patel', contactEmail: 'vikram.patel@techsolutions.in', contactPhone: '+91 98201 22334', invoiceItems: [{ description: 'Enterprise Cloud Infrastructure (Q1 2026)', quantity: 1, unitPriceINR: 120000 }, { description: 'Technical Support Retainer', quantity: 3, unitPriceINR: 15000 }, { description: 'Data Migration Services', quantity: 1, unitPriceINR: 20000 }], poNumber: 'PO-TECH-2026-088', gracePeriodDays: 7, totalLifetimeBusinessINR: 4200000, historicalOnTimePaymentRate: 0.82, recoveryProbability: 0.88 },
      diagnosis: { rootCauseCategory: 'INVOICE_APPROVAL_DELAY', rootCauseDetail: 'Internal procurement approval delayed by 2 weeks at TechSolutions.', confidenceScore: 0.94, isTransient: false, bankCode: 'HDFC', bankSwitchHealthIndex: 94.8, recommendedRailSwitch: 'NETBANKING', diagnosedAt: new Date(Date.now() - 3600000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'PAYMENT_LINK_DISPATCH', targetChannel: 'EMAIL', offeredDiscountPct: 0, calculatedIncentiveINR: 0, delayMinutes: 0, reasoning: 'High-value enterprise account (₹1.85L, 82% on-time history). No discount needed.', expectedRecoveryProbability: 0.88, scheduledExecutionAt: new Date(Date.now() - 3500000).toISOString(), tokensUsed: 0 },
      compliance: { approved: true, rulesPassed: ['TRAI_QUIET_HOURS_OK', 'B2B_INVOICING_COMPLIANT', 'VALUE_WITHIN_AUTO_THRESHOLD'], violations: [], requiresHumanApproval: false, evaluatedAt: new Date(Date.now() - 3400000).toISOString(), tokensUsed: 0 },
      outcome: { isRecovered: true, recoveredAmount: 185000.00, settledPaymentId: 'pay_inv_881_settled', paymentLinkId: 'plink_inv_881', reconciliationMethod: 'PAYMENT_LINK_PAID_WEBHOOK', recoveredAt: new Date(Date.now() - 2592000000).toISOString(), timeToRecoverSeconds: 1296000, attributedChannel: 'EMAIL_PAYMENT_LINK', costOfIncentiveINR: 0, estimatedMdrFeeINR: 2775.00, mdrRatePct: 1.5, businessInsights: 'Recovered ₹1,85,000 overdue invoice from TechSolutions via professional email + payment link.' },
      createdAt: new Date(Date.now() - 3888000000).toISOString(),
      updatedAt: new Date(Date.now() - 2592000000).toISOString()
    },
    {
      caseId: 'REC-INV-882',
      merchantId: 'mer_razorpay_demo',
      eventType: 'INVOICE_OVERDUE',
      status: 'NEGOTIATING',
      amount: 420000.00,
      currency: 'INR',
      riskTier: 'CRITICAL',
      customer: { id: 'cust_inv_882', name: 'Neha Agarwal', phone: '+91 99302 55667', email: 'neha.agarwal@manufacturing.co', clvTier: 'PLATINUM', historicalRecoveries: 0, totalLifetimeSpendINR: 8500000 },
      sourceEvent: { invoiceId: 'inv_mfg_882', amount: 420000.00, currency: 'INR', method: 'NETBANKING', errorCode: 'INVOICE_OVERDUE', errorDescription: 'Invoice INV-2026-MFG-112 overdue by 92 days.', occurredAt: new Date(Date.now() - 7948800000).toISOString(), bankCode: 'ICICI' },
      invoiceProfile: { invoiceId: 'inv_mfg_882', invoiceNumber: 'INV-2026-MFG-112', invoiceDate: new Date(Date.now() - 7948800000).toISOString(), dueDate: new Date(Date.now() - 2678400000).toISOString(), daysPastDue: 92, dpdBucket: 'OVERDUE_90_PLUS', outstandingAmountINR: 420000.00, originalAmountINR: 420000.00, paymentTerms: 'NET_60', companyName: 'Precision Manufacturing Ltd', companyGstin: '29AABCP5678G1Z8', contactPerson: 'Neha Agarwal', contactEmail: 'neha.agarwal@manufacturing.co', contactPhone: '+91 99302 55667', invoiceItems: [{ description: 'Industrial IoT Platform License (Annual)', quantity: 1, unitPriceINR: 280000 }, { description: 'On-site Implementation Support (10 days)', quantity: 10, unitPriceINR: 12000 }, { description: 'Custom Dashboard Module', quantity: 1, unitPriceINR: 20000 }], poNumber: 'PO-MFG-2026-201', gracePeriodDays: 7, totalLifetimeBusinessINR: 8500000, historicalOnTimePaymentRate: 0.65, recoveryProbability: 0.72 },
      diagnosis: { rootCauseCategory: 'INVOICE_CASHFLOW_ISSUE', rootCauseDetail: 'Precision Manufacturing reports Q2 cash flow constraints.', confidenceScore: 0.91, isTransient: false, bankCode: 'ICICI', bankSwitchHealthIndex: 96.1, recommendedRailSwitch: 'NETBANKING', diagnosedAt: new Date(Date.now() - 3600000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'PAYMENT_LINK_DISPATCH', targetChannel: 'EMAIL', offeredDiscountPct: 2.0, calculatedIncentiveINR: 8400, delayMinutes: 0, reasoning: 'High-value ₹4.2L invoice at 92+ DPD with cash flow root cause. Offer 2% early payment discount.', expectedRecoveryProbability: 0.72, scheduledExecutionAt: new Date(Date.now() - 3500000).toISOString(), tokensUsed: 0 },
      compliance: { approved: true, rulesPassed: ['TRAI_QUIET_HOURS_OK', 'B2B_INVOICING_COMPLIANT'], violations: [], requiresHumanApproval: false, evaluatedAt: new Date(Date.now() - 3400000).toISOString(), tokensUsed: 0 },
      createdAt: new Date(Date.now() - 7948800000).toISOString(),
      updatedAt: new Date(Date.now() - 3400000).toISOString()
    },
    // Voice Recovery Agent Seed Cases
    {
      caseId: 'REC-VO-901',
      merchantId: 'mer_razorpay_demo',
      eventType: 'PAYMENT_FAILED',
      status: 'RECOVERED',
      amount: 4999.00,
      currency: 'INR',
      riskTier: 'MEDIUM',
      customer: { id: 'cust_vo_901', name: 'Priya Sharma', phone: '+91 98765 43210', email: 'priya.sharma@gmail.com', clvTier: 'GOLD', historicalRecoveries: 1, totalLifetimeSpendINR: 85000 },
      sourceEvent: { paymentId: 'pay_vo_901_failed', amount: 4999.00, currency: 'INR', method: 'UPI', errorCode: 'UPI_INSUFFICIENT_FUNDS', errorDescription: 'Customer UPI transaction failed due to insufficient funds.', occurredAt: new Date(Date.now() - 43200000).toISOString(), bankCode: 'SBI' },
      voiceProfile: {
        agentId: 'voice-agent-001', caseId: 'REC-VO-901', phoneNumber: '+91 98765 43210', callerName: 'Priya Sharma',
        languageVariant: 'HINGLISH', toneVariant: 'FRIENDLY',
        scriptSegments: [
          { segment: 'GREETING', textEN: 'Hello Priya, this is a call from your payment platform regarding your recent transaction.', textHinglish: 'Namaste Priya ji, main aapki payment platform se bol raha hoon.', textHindi: 'नमस्ते प्रिया जी, मैं आपकी पेमेंट प्लेटफॉर्म से बोल रहा हूँ।' },
          { segment: 'ISSUE_EXPLANATION', textEN: 'Your payment of ₹4,999 could not be processed due to insufficient balance.', textHinglish: 'Aapka ₹4,999 ka payment process nahi ho paya kyunki balance kami hai.', textHindi: 'आपका ₹4,999 का पेमेंट प्रोसेस नहीं हो पाया क्योंकि बैलेंस कम है।' },
          { segment: 'RECOVERY_OFFER', textEN: 'We can retry the payment now, or you can use a different payment method.', textHinglish: 'Hum abhi payment retry kar sakte hain, ya aap doosra method use kar sakte hain.', textHindi: 'हम अभी पेमेंट रीट्राई कर सकते हैं, या आप दूसरा मेथड इस्तेमाल कर सकते हैं।' },
          { segment: 'PAYMENT_CTA', textEN: 'I can send you a payment link right now.', textHinglish: 'Main aapko abhi payment link bhej sakta hoon.', textHindi: 'मैं आपको अभी पेमेंट लिंक भेज सकता हूँ।' }
        ],
        retryCount: 1, maxRetries: 3,
        callStartedAt: new Date(Date.now() - 42000000).toISOString(), callEndedAt: new Date(Date.now() - 41700000).toISOString(), callDurationSeconds: 185,
        outcome: 'PROMISE_TO_PAY', outcomeReason: 'Customer confirmed will retry payment within 2 hours after salary credit.',
        promisedPaymentDate: new Date(Date.now() - 36000000).toISOString(), promisedAmountINR: 4999,
        dnis: '1800123456', ani: '+91 98765 43210', campaignId: 'CAMP-VO-2026-001'
      },
      diagnosis: { rootCauseCategory: 'INSUFFICIENT_FUNDS', rootCauseDetail: 'Customer UPI transaction failed due to insufficient funds.', confidenceScore: 0.92, isTransient: true, bankCode: 'SBI', bankSwitchHealthIndex: 97.2, recommendedRailSwitch: 'UPI', diagnosedAt: new Date(Date.now() - 41500000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'VOICE_CALL', targetChannel: 'VOICE', offeredDiscountPct: 0, calculatedIncentiveINR: 0, delayMinutes: 0, reasoning: 'Gold CLV customer with transient insufficient funds.', expectedRecoveryProbability: 0.85, scheduledExecutionAt: new Date(Date.now() - 41000000).toISOString(), tokensUsed: 0 },
      compliance: { approved: true, rulesPassed: ['TRAI_QUIET_HOURS_OK', 'VOICE_CALL_CONSENT_OBTAINED', 'DO_NOT_DISTURB_CLEAR'], violations: [], requiresHumanApproval: false, evaluatedAt: new Date(Date.now() - 40500000).toISOString(), tokensUsed: 0 },
      outcome: { isRecovered: true, recoveredAmount: 4999.00, settledPaymentId: 'pay_vo_901_settled', reconciliationMethod: 'VOICE_PROMISE_UPI_RETRY', recoveredAt: new Date(Date.now() - 34200000).toISOString(), timeToRecoverSeconds: 7800, attributedChannel: 'VOICE_HINGLISH', costOfIncentiveINR: 0, estimatedMdrFeeINR: 14.99, mdrRatePct: 0.3, businessInsights: 'Recovered ₹4,999 via Hinglish voice call.' },
      createdAt: new Date(Date.now() - 43200000).toISOString(),
      updatedAt: new Date(Date.now() - 34200000).toISOString()
    },
    {
      caseId: 'REC-VO-902',
      merchantId: 'mer_razorpay_demo',
      eventType: 'CHECKOUT_ABANDONED',
      status: 'RECOVERED',
      amount: 14999.00,
      currency: 'INR',
      riskTier: 'HIGH',
      customer: { id: 'cust_vo_902', name: 'Rahul Verma', phone: '+91 87654 32109', email: 'rahul.verma@outlook.com', clvTier: 'PLATINUM', historicalRecoveries: 3, totalLifetimeSpendINR: 210000 },
      sourceEvent: { amount: 14999.00, currency: 'INR', method: 'UPI', errorCode: 'CHECKOUT_ABANDONED', errorDescription: 'High-value checkout abandoned at payment page.', occurredAt: new Date(Date.now() - 7200000).toISOString(), bankCode: 'HDFC' },
      checkoutProfile: { checkoutId: 'chk_vo_902', sessionId: 'sess_vo_902', abandonedAt: new Date(Date.now() - 7200000).toISOString(), lastActivityAt: new Date(Date.now() - 7200000).toISOString(), stageReached: 'PAYMENT_SELECTION', cartValueINR: 14999, cartItems: [{ name: 'Premium Headphones', quantity: 1, priceINR: 9999 }, { name: 'Phone Case', quantity: 1, priceINR: 5000 }], totalCartItems: 2, deviceType: 'desktop', browserSessionDurationSec: 420, previousVisitCount: 3, recoveryProbability: 0.88 },
      voiceProfile: {
        agentId: 'voice-agent-002', caseId: 'REC-VO-902', phoneNumber: '+91 87654 32109', callerName: 'Rahul Verma',
        languageVariant: 'ENGLISH', toneVariant: 'PROFESSIONAL',
        scriptSegments: [
          { segment: 'GREETING', textEN: 'Good afternoon Rahul, this is a quick call from your shopping platform.', textHinglish: 'Good afternoon Rahul ji, main aapke shopping platform se call kar raha hoon.', textHindi: 'नमस्ते राहुल जी, मैं आपके शॉपिंग प्लेटफॉर्म से बोल रहा हूँ।' },
          { segment: 'ISSUE_EXPLANATION', textEN: 'I noticed you were looking at items worth ₹14,999 but the payment did not go through.', textHinglish: 'Maine dekha ki aap ₹14,999 ka kuch items dekh rahe the lekin payment complete nahi hua.', textHindi: 'मैंने देखा कि आप ₹14,999 का कुछ आइटम्स देख रहे थे लेकिन पेमेंट कंप्लीट नहीं हुआ।' },
          { segment: 'RECOVERY_OFFER', textEN: 'I can help you complete the purchase right now with a 5% instant discount.', textHinglish: 'Main aapki purchase complete karne mein help kar sakta hoon. 5% instant discount bhi hai.', textHindi: 'मैं आपकी परचेज़ कंप्लीट करने में हेल्प कर सकता हूँ। 5% इंस्टैंट डिस्काउंट भी है।' },
          { segment: 'PAYMENT_CTA', textEN: 'Shall I send you a secure payment link?', textHinglish: 'Kya main aapko ek secure payment link bhej doon?', textHindi: 'क्या मैं आपको एक सिक्योर पेमेंट लिंक भेज दूँ?' }
        ],
        retryCount: 1, maxRetries: 2,
        callStartedAt: new Date(Date.now() - 6900000).toISOString(), callEndedAt: new Date(Date.now() - 6600000).toISOString(), callDurationSeconds: 240,
        outcome: 'PROMISE_TO_PAY', outcomeReason: 'Customer completed payment via UPI link shared during call. 5% discount applied.',
        promisedPaymentDate: new Date(Date.now() - 6000000).toISOString(), promisedAmountINR: 14249.05,
        dnis: '1800123456', ani: '+91 87654 32109', campaignId: 'CAMP-VO-2026-002'
      },
      diagnosis: { rootCauseCategory: 'STICKY_CHECKOUT', rootCauseDetail: 'High-value cart abandoned at payment page on desktop.', confidenceScore: 0.88, isTransient: true, bankCode: 'HDFC', bankSwitchHealthIndex: 94.8, recommendedRailSwitch: 'UPI', diagnosedAt: new Date(Date.now() - 6500000).toISOString(), tokensUsed: 0 },
      strategy: { recommendedAction: 'VOICE_CALL', targetChannel: 'VOICE', offeredDiscountPct: 5, calculatedIncentiveINR: 749.95, delayMinutes: 0, reasoning: 'Platinum CLV customer with high cart value.', expectedRecoveryProbability: 0.88, scheduledExecutionAt: new Date(Date.now() - 6200000).toISOString(), tokensUsed: 0 },
      compliance: { approved: true, rulesPassed: ['TRAI_QUIET_HOURS_OK', 'VOICE_CALL_CONSENT_OBTAINED', 'DISCOUNT_WITHIN_THRESHOLD'], violations: [], requiresHumanApproval: false, evaluatedAt: new Date(Date.now() - 6100000).toISOString(), tokensUsed: 0 },
      outcome: { isRecovered: true, recoveredAmount: 14249.05, settledPaymentId: 'pay_vo_902_settled', paymentLinkId: 'plink_vo_902', reconciliationMethod: 'VOICE_LINK_PAID_WEBHOOK', recoveredAt: new Date(Date.now() - 5400000).toISOString(), timeToRecoverSeconds: 1800, attributedChannel: 'VOICE_ENGLISH', costOfIncentiveINR: 749.95, estimatedMdrFeeINR: 42.75, mdrRatePct: 0.3, businessInsights: 'Recovered ₹14,249 via English voice call with 5% discount.' },
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 5400000).toISOString()
    }
  ];

  // 3. Initial Audits
  const auditEntries: Omit<AuditLogEntry, 'id' | 'signatureHash' | 'timestamp'>[] = [
    { caseId: 'REC-2026-881', agentName: 'Detection Agent', action: 'INGEST_FAILURE_EVENT', rationale: 'Ingested Razorpay webhook payment.failed for ₹4,999. Customer CLV tier evaluated as PLATINUM.', model: 'gemini-2.0-flash', latencyMs: 140, tokensUsed: 210 },
    { caseId: 'REC-2026-881', agentName: 'Diagnosis Agent', action: 'CORRELATE_BANK_HEALTH', rationale: 'Correlated with HDFC switch health (94.8% healthy). Pinpointed user-level daily ticket limit exhaustion.', model: 'gemini-2.0-flash', latencyMs: 280, tokensUsed: 390 },
    { caseId: 'REC-2026-881', agentName: 'Strategy Optimizer Agent', action: 'FORMULATE_ACP_OFFER', rationale: 'Calculated Expected Value of 5% instant discount at ₹4,749 > ₹0 default churn loss.', model: 'gemini-2.0-flash', latencyMs: 410, tokensUsed: 580 },
    { caseId: 'REC-2026-881', agentName: 'Compliance Agent', action: 'VERIFY_POLICY_GUARDRAILS', rationale: 'All checks passed: quiet hours, discount ceiling (5% <= 10%), attempt limit (1/3).', model: 'deterministic-rules', latencyMs: 15, tokensUsed: 0 },
    { caseId: 'REC-2026-881', agentName: 'Outcome Agent', action: 'SETTLE_AND_ATTRIBUTE_RECOVERY', rationale: 'Payment captured via Razorpay ID pay_Ky9912bZ99. Attributed to WhatsApp ACP link.', model: 'deterministic-rules', latencyMs: 30, tokensUsed: 0 },
    { caseId: 'REC-INV-881', agentName: 'Receivables Detection Agent', action: 'INVOICE_OVERDUE_DETECTED', rationale: 'Invoice INV-2026-TS-441 (₹1,85,000) overdue 45 days at TechSolutions.', model: 'deterministic-receivables-detector', latencyMs: 4, tokensUsed: 0 },
    { caseId: 'REC-INV-881', agentName: 'Receivables Diagnosis Agent', action: 'INVOICE_ROOT_CAUSE_FORENSICS', rationale: 'Root cause: Internal procurement approval delay at client.', model: 'deterministic-receivables-diagnosis', latencyMs: 6, tokensUsed: 0 },
    { caseId: 'REC-INV-881', agentName: 'Recovery Agent', action: 'B2B_PAYMENT_LINK_DISPATCHED', rationale: 'Dispatched professional B2B payment link (₹1,85,000) via email to AP contact.', model: 'deterministic-receivables-recovery', latencyMs: 12, tokensUsed: 0 },
    { caseId: 'REC-INV-882', agentName: 'Receivables Detection Agent', action: 'INVOICE_OVERDUE_DETECTED', rationale: 'Invoice INV-2026-MFG-112 (₹4,20,000) overdue 92 days at Precision Manufacturing.', model: 'deterministic-receivables-detector', latencyMs: 5, tokensUsed: 0 },
    { caseId: 'REC-VO-901', agentName: 'Voice Recovery Agent', action: 'VOICE_CALL_INITIATED', rationale: 'Hinglish voice call initiated to Priya Sharma for failed UPI payment of ₹4,999.', model: 'voice-agent-gemini', latencyMs: 180, tokensUsed: 320 },
    { caseId: 'REC-VO-901', agentName: 'Voice Recovery Agent', action: 'PROMISE_TO_PAY_CAPTURED', rationale: 'Customer promised to retry payment within 2 hours after salary credit.', model: 'voice-agent-gemini', latencyMs: 45, tokensUsed: 120 },
    { caseId: 'REC-VO-902', agentName: 'Voice Recovery Agent', action: 'VOICE_CALL_INITIATED', rationale: 'English voice call initiated to Rahul Verma for abandoned checkout of ₹14,999.', model: 'voice-agent-gemini', latencyMs: 195, tokensUsed: 350 },
    { caseId: 'REC-VO-902', agentName: 'Voice Recovery Agent', action: 'PAYMENT_RECOVERED_VIA_VOICE', rationale: 'Customer completed ₹14,249 payment via UPI link shared during English voice call.', model: 'voice-agent-gemini', latencyMs: 50, tokensUsed: 140 }
  ];

  const auditLogs: AuditLogEntry[] = auditEntries.map(entry => {
    const timestamp = new Date(Date.now() - 3500000).toISOString();
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rawPayload = `${entry.caseId}:${entry.agentName}:${entry.action}:${entry.rationale}:${timestamp}`;
    const signatureHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    return { ...entry, id, timestamp, signatureHash };
  });

  return { bankHealth, cases, auditLogs };
}
