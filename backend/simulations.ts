/**
 * Simulation functions for RecoverFlow AI
 * Extracted from razorpay.ts for better code organization
 */

import { db } from './db.js';
import { pipelineJobQueue } from './job-queue.js';
import { RecoveryCase, PaymentMethod, ChannelType, CheckoutStage, CheckoutProfile, InvoiceDPD } from '../src/types/index.js';

export class SimulationService {
  /**
   * Helper to simulate a realistic multi-transaction failure batch for live judge demonstrations
   * Generates a diverse batch of failed payments across UPI, Cards, Netbanking & Mandates,
   * triggering the multi-agent pipeline and calculating real financial recovery evidence.
   */
  public static async simulateBatchFailureStream(batchSize: number = 5): Promise<{
    batchId: string;
    casesCreated: RecoveryCase[];
    totalBatchRevenueAtRiskINR: number;
  }> {
    const batchId = `BATCH-${Date.now()}`;
    const scenarios: Array<{
      name: string;
      email: string;
      phone: string;
      tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
      amount: number;
      method: PaymentMethod;
      bankCode: string;
      errorCode: string;
      errorDescription: string;
      eventType: 'PAYMENT_FAILED' | 'SUBSCRIPTION_HALTED';
    }> = [
      {
        name: 'Devika Singhania',
        email: 'devika.s@enterprise.in',
        phone: '+91 98200 44321',
        tier: 'PLATINUM',
        amount: 34500.00,
        method: 'CARD',
        bankCode: 'HDFC',
        errorCode: 'GATEWAY_ERROR',
        errorDescription: '3D Secure 2.0 biometric challenge timeout on HDFC corporate gateway',
        eventType: 'PAYMENT_FAILED'
      },
      {
        name: 'Arjun Venkatesh',
        email: 'arjun.v@retailpay.in',
        phone: '+91 97401 98822',
        tier: 'GOLD',
        amount: 8999.00,
        method: 'UPI',
        bankCode: 'SBI',
        errorCode: 'BAD_REQUEST_ERROR',
        errorDescription: 'NPCI UPI switch response timeout (>4500ms) on SBI issuing VPA',
        eventType: 'PAYMENT_FAILED'
      },
      {
        name: 'Nisha Pillai',
        email: 'nisha.p@saasflows.io',
        phone: '+91 99302 77112',
        tier: 'GOLD',
        amount: 4499.00,
        method: 'NACH_MANDATE',
        bankCode: 'ICICI',
        errorCode: 'MANDATE_INVALID',
        errorDescription: 'Recurring monthly SaaS subscription debit failed due to expired e-Mandate',
        eventType: 'SUBSCRIPTION_HALTED'
      },
      {
        name: 'Kunal Malhotra',
        email: 'kunal.m@gmail.com',
        phone: '+91 98110 33445',
        tier: 'SILVER',
        amount: 2199.00,
        method: 'UPI',
        bankCode: 'AXIS',
        errorCode: 'LIMIT_EXCEEDED',
        errorDescription: 'Axis Bank cumulative daily UPI ticket transfer ceiling exceeded',
        eventType: 'PAYMENT_FAILED'
      },
      {
        name: 'Pooja Bhattacharya',
        email: 'pooja.b@b2bcloud.co',
        phone: '+91 98300 66554',
        tier: 'PLATINUM',
        amount: 52000.00,
        method: 'NETBANKING',
        bankCode: 'SBI',
        errorCode: 'GATEWAY_TIMEOUT',
        errorDescription: 'SBI Corporate Netbanking session expired before OTP submission',
        eventType: 'PAYMENT_FAILED'
      },
      {
        name: 'Tarun Saxena',
        email: 'tarun.s@fintechlabs.in',
        phone: '+91 97115 88990',
        tier: 'BRONZE',
        amount: 1299.00,
        method: 'WALLET',
        bankCode: 'HDFC',
        errorCode: 'INSUFFICIENT_FUNDS',
        errorDescription: 'Prepaid wallet balance inadequate for instant checkout settlement',
        eventType: 'PAYMENT_FAILED'
      }
    ];

    const actualCount = Math.min(batchSize, scenarios.length);
    const createdCases: RecoveryCase[] = [];
    let totalBatchAtRisk = 0;

    for (let i = 0; i < actualCount; i++) {
      const s = scenarios[i];
      const caseId = `REC-BATCH-${Date.now().toString().slice(-4)}-${i + 1}`;
      totalBatchAtRisk += s.amount;

      const newCase: RecoveryCase = {
        caseId,
        merchantId: 'mer_razorpay_demo',
        eventType: s.eventType,
        status: 'DETECTED',
        amount: s.amount,
        currency: 'INR',
        riskTier: s.amount >= 25000 ? 'CRITICAL' : (s.amount >= 5000 ? 'HIGH' : 'MEDIUM'),
        customer: {
          id: `cust_batch_${Date.now()}_${i}`,
          name: s.name,
          phone: s.phone,
          email: s.email,
          clvTier: s.tier,
          historicalRecoveries: Math.floor(Math.random() * 3),
          totalLifetimeSpendINR: s.amount * 4
        },
        sourceEvent: {
          paymentId: `pay_batch_${Date.now()}_${i}`,
          orderId: `order_batch_${Date.now()}_${i}`,
          amount: s.amount,
          currency: 'INR',
          method: s.method,
          errorCode: s.errorCode,
          errorDescription: s.errorDescription,
          occurredAt: new Date().toISOString(),
          bankCode: s.bankCode
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.upsertCase(newCase);
      createdCases.push(newCase);

      // Persistent job queue with staggered delay for natural UX
      pipelineJobQueue.enqueue(newCase, undefined, (i + 1) * 350);
    }

    return {
      batchId,
      casesCreated: createdCases,
      totalBatchRevenueAtRiskINR: totalBatchAtRisk
    };
  }

  /**
   * Helper to simulate webhook triggers for live judge demonstrations
   */
  public static async simulateIncomingFailure(scenario: 'UPI_LIMIT' | 'SBI_DOWNTIME' | 'HIGH_VALUE_B2B' | 'SUBSCRIPTION_HALT'): Promise<RecoveryCase> {
    const caseId = `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    let newCase: RecoveryCase;

    switch (scenario) {
      case 'UPI_LIMIT':
        newCase = {
          caseId,
          merchantId: 'mer_razorpay_demo',
          eventType: 'PAYMENT_FAILED',
          status: 'DETECTED',
          amount: 5499.00,
          currency: 'INR',
          riskTier: 'HIGH',
          customer: {
            id: 'cust_live_881',
            name: 'Vikramaditya Roy',
            phone: '+91 98450 12345',
            email: 'vikram.roy@example.com',
            clvTier: 'PLATINUM',
            historicalRecoveries: 2,
            totalLifetimeSpendINR: 92000
          },
          sourceEvent: {
            paymentId: `pay_live_${Date.now()}`,
            orderId: `order_live_${Date.now()}`,
            amount: 5499.00,
            currency: 'INR',
            method: 'UPI',
            errorCode: 'BAD_REQUEST_ERROR',
            errorDescription: 'Single transaction UPI limit exceeded on issuing bank (HDFC)',
            occurredAt: new Date().toISOString(),
            bankCode: 'HDFC'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        break;

      case 'SBI_DOWNTIME':
        newCase = {
          caseId,
          merchantId: 'mer_razorpay_demo',
          eventType: 'PAYMENT_FAILED',
          status: 'DETECTED',
          amount: 12999.00,
          currency: 'INR',
          riskTier: 'CRITICAL',
          customer: {
            id: 'cust_live_882',
            name: 'Priya Sharma',
            phone: '+91 99201 55667',
            email: 'priya.s@enterprise.com',
            clvTier: 'GOLD',
            historicalRecoveries: 1,
            totalLifetimeSpendINR: 45000
          },
          sourceEvent: {
            paymentId: `pay_live_${Date.now()}`,
            orderId: `order_live_${Date.now()}`,
            amount: 12999.00,
            currency: 'INR',
            method: 'NETBANKING',
            errorCode: 'GATEWAY_TIMEOUT',
            errorDescription: 'SBI Netbanking gateway unreachable - maintenance window exceeded SLA',
            occurredAt: new Date().toISOString(),
            bankCode: 'SBI'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        break;

      case 'HIGH_VALUE_B2B':
        newCase = {
          caseId,
          merchantId: 'mer_razorpay_demo',
          eventType: 'PAYMENT_FAILED',
          status: 'DETECTED',
          amount: 285000.00,
          currency: 'INR',
          riskTier: 'CRITICAL',
          customer: {
            id: 'cust_live_883',
            name: 'Rajesh Enterprises',
            phone: '+91 98765 43210',
            email: 'rajesh@enterprises.com',
            clvTier: 'PLATINUM',
            historicalRecoveries: 5,
            totalLifetimeSpendINR: 2500000
          },
          sourceEvent: {
            paymentId: `pay_live_${Date.now()}`,
            orderId: `order_live_${Date.now()}`,
            amount: 285000.00,
            currency: 'INR',
            method: 'NETBANKING',
            errorCode: 'GATEWAY_ERROR',
            errorDescription: 'High-value B2B transfer failed - additional authentication required',
            occurredAt: new Date().toISOString(),
            bankCode: 'HDFC'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        break;

      case 'SUBSCRIPTION_HALT':
        newCase = {
          caseId,
          merchantId: 'mer_razorpay_demo',
          eventType: 'SUBSCRIPTION_HALTED',
          status: 'DETECTED',
          amount: 2999.00,
          currency: 'INR',
          riskTier: 'MEDIUM',
          customer: {
            id: 'cust_live_884',
            name: 'Ananya Patel',
            phone: '+91 98123 45678',
            email: 'ananya.p@startup.co',
            clvTier: 'SILVER',
            historicalRecoveries: 0,
            totalLifetimeSpendINR: 12000
          },
          sourceEvent: {
            subscriptionId: `sub_live_${Date.now()}`,
            amount: 2999.00,
            currency: 'INR',
            method: 'NACH_MANDATE',
            errorCode: 'MANDATE_INVALID',
            errorDescription: 'Recurring subscription mandate expired - renewal payment failed',
            occurredAt: new Date().toISOString(),
            bankCode: 'ICICI'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        break;
    }

    await db.upsertCase(newCase!);

    await db.addAuditLog({
      caseId: newCase!.caseId,
      agentName: 'Payment Failure Sentinel',
      action: 'PAYMENT_FAILURE_INGESTED',
      rationale: `Simulated ${scenario} failure: ₹${newCase!.amount.toLocaleString('en-IN')} ${newCase!.sourceEvent.method}. Customer: ${newCase!.customer.name} (${newCase!.customer.clvTier}). Bank: ${newCase!.sourceEvent.bankCode}. Error: ${newCase!.sourceEvent.errorCode}.`,
      model: 'payment-failure-sentinel',
      latencyMs: 4,
      tokensUsed: 0
    });

    pipelineJobQueue.enqueue(newCase!);

    return newCase!;
  }

  /**
   * Simulate a checkout abandonment scenario for live judge demonstrations.
   */
  public static async simulateCheckoutAbandonment(
    scenario: 'HIGH_VALUE_CART' | 'MOBILE_FRICTION' | 'OTP_TIMEOUT' | 'PRICE_SENSITIVITY' = 'HIGH_VALUE_CART'
  ): Promise<RecoveryCase> {
    const caseId = `REC-CO-${Date.now().toString().slice(-4)}`;
    let newCase: RecoveryCase;

    const scenarios: Record<string, {
      name: string;
      email: string;
      phone: string;
      tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
      cartValue: number;
      method: PaymentMethod;
      bankCode: string;
      stage: CheckoutStage;
      device: 'mobile' | 'desktop' | 'tablet';
      sessionDuration: number;
      priorVisits: number;
      items: Array<{ name: string; quantity: number; priceINR: number }>;
    }> = {
      HIGH_VALUE_CART: {
        name: 'Shreya Iyer',
        email: 'shreya.iyer@enterprise.in',
        phone: '+91 98200 11223',
        tier: 'PLATINUM',
        cartValue: 34999.00,
        method: 'CARD',
        bankCode: 'ICICI',
        stage: 'PAYMENT_AUTHORIZATION',
        device: 'desktop',
        sessionDuration: 312,
        priorVisits: 6,
        items: [
          { name: 'Enterprise Analytics Suite (Annual)', quantity: 1, priceINR: 24999 },
          { name: 'Priority Support Add-on', quantity: 1, priceINR: 5000 },
          { name: 'Custom Integration Module', quantity: 1, priceINR: 5000 }
        ]
      },
      MOBILE_FRICTION: {
        name: 'Arjun Reddy',
        email: 'arjun.r@startup.co',
        phone: '+91 97401 88221',
        tier: 'GOLD',
        cartValue: 8999.00,
        method: 'UPI',
        bankCode: 'HDFC',
        stage: 'PAYMENT_SELECTION',
        device: 'mobile',
        sessionDuration: 480,
        priorVisits: 2,
        items: [
          { name: 'Smart Fitness Band Pro', quantity: 1, priceINR: 5999 },
          { name: 'Silicone Strap Pack', quantity: 1, priceINR: 999 },
          { name: 'Screen Protector', quantity: 2, priceINR: 500 }
        ]
      },
      OTP_TIMEOUT: {
        name: 'Nandini Sharma',
        email: 'nandini.s@corp.com',
        phone: '+91 99302 44556',
        tier: 'GOLD',
        cartValue: 12499.00,
        method: 'CARD',
        bankCode: 'SBI',
        stage: 'OTP_ENTRY',
        device: 'desktop',
        sessionDuration: 265,
        priorVisits: 4,
        items: [
          { name: 'Wireless Noise-Cancelling Headphones', quantity: 1, priceINR: 9999 },
          { name: 'Premium Carrying Case', quantity: 1, priceINR: 2500 }
        ]
      },
      PRICE_SENSITIVITY: {
        name: 'Karthik Menon',
        email: 'karthik.m@email.com',
        phone: '+91 98456 77889',
        tier: 'SILVER',
        cartValue: 3499.00,
        method: 'UPI',
        bankCode: 'AXIS',
        stage: 'CART_VIEW',
        device: 'mobile',
        sessionDuration: 95,
        priorVisits: 1,
        items: [
          { name: 'Organic Cotton T-Shirt', quantity: 2, priceINR: 999 },
          { name: 'Canvas Tote Bag', quantity: 1, priceINR: 500 }
        ]
      }
    };

    const s = scenarios[scenario] || scenarios.HIGH_VALUE_CART;

    newCase = {
      caseId,
      merchantId: 'mer_razorpay_demo',
      eventType: 'CHECKOUT_ABANDONED',
      status: 'DETECTED',
      amount: s.cartValue,
      currency: 'INR',
      riskTier: s.cartValue >= 25000 ? 'CRITICAL' : (s.cartValue >= 5000 ? 'HIGH' : 'MEDIUM'),
      customer: {
        id: `cust_co_${Date.now()}`,
        name: s.name,
        phone: s.phone,
        email: s.email,
        clvTier: s.tier,
        historicalRecoveries: s.tier === 'PLATINUM' ? 2 : (s.tier === 'GOLD' ? 1 : 0),
        totalLifetimeSpendINR: s.cartValue * (s.tier === 'PLATINUM' ? 8 : (s.tier === 'GOLD' ? 4 : 2))
      },
      sourceEvent: {
        orderId: `order_co_${Date.now()}`,
        amount: s.cartValue,
        currency: 'INR',
        method: s.method,
        errorCode: 'CHECKOUT_ABANDONED',
        errorDescription: `Customer abandoned checkout at ${s.stage.replace(/_/g, ' ')} stage after ${Math.round(s.sessionDuration / 60)} min ${s.sessionDuration % 60} sec session`,
        occurredAt: new Date().toISOString(),
        bankCode: s.bankCode
      },
      checkoutProfile: {
        checkoutId: `chk_${Date.now()}`,
        sessionId: `sess_${Date.now()}`,
        abandonedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        stageReached: s.stage,
        cartValueINR: s.cartValue,
        cartItems: s.items,
        totalCartItems: s.items.reduce((sum, i) => sum + i.quantity, 0),
        deviceType: s.device,
        browserSessionDurationSec: s.sessionDuration,
        previousVisitCount: s.priorVisits,
        recoveryProbability: 0.75
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.upsertCase(newCase);

    await db.addAuditLog({
      caseId: newCase.caseId,
      agentName: 'Checkout Abandonment Sentinel',
      action: 'CHECKOUT_ABANDONMENT_INGESTED',
      rationale: `Checkout abandoned at ${s.stage.replace(/_/g, ' ')} stage. Cart: ₹${s.cartValue.toLocaleString('en-IN')} (${s.items.length} items). Customer: ${s.name} (${s.tier}). Device: ${s.device}. Dispatching to Checkout Recovery Agents.`,
      model: 'checkout-sentinel',
      latencyMs: 6,
      tokensUsed: 0
    });

    pipelineJobQueue.enqueue(newCase);

    return newCase;
  }

  /**
   * Simulate a batch of checkout abandonments across different stages and devices.
   */
  public static async simulateCheckoutBatchStream(batchSize: number = 4): Promise<{
    batchId: string;
    casesCreated: RecoveryCase[];
    totalCartValueAtRiskINR: number;
  }> {
    const batchId = `CO-BATCH-${Date.now()}`;
    const scenarios: Array<'HIGH_VALUE_CART' | 'MOBILE_FRICTION' | 'OTP_TIMEOUT' | 'PRICE_SENSITIVITY'> = [
      'HIGH_VALUE_CART', 'MOBILE_FRICTION', 'OTP_TIMEOUT', 'PRICE_SENSITIVITY'
    ];

    const actualCount = Math.min(batchSize, scenarios.length);
    const createdCases: RecoveryCase[] = [];
    let totalCartValueAtRisk = 0;

    for (let i = 0; i < actualCount; i++) {
      const testCase = await this.simulateCheckoutAbandonment(scenarios[i]);
      totalCartValueAtRisk += testCase.amount;
      createdCases.push(testCase);

      // Stagger pipeline triggers
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return { batchId, casesCreated: createdCases, totalCartValueAtRiskINR: totalCartValueAtRisk };
  }

  /**
   * Simulate an overdue invoice scenario for B2B receivables recovery.
   */
  public static async simulateOverdueInvoice(
    scenario: 'APPROVAL_DELAY' | 'PROCUREMENT_DELAY' | 'CASHFLOW_ISSUE' | 'ENTERPRISE_OVERDUE' = 'APPROVAL_DELAY'
  ): Promise<RecoveryCase> {
    const caseId = `REC-INV-${Date.now().toString().slice(-4)}`;

    const scenarios: Record<string, {
      contactName: string;
      email: string;
      phone: string;
      tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
      amount: number;
      method: PaymentMethod;
      bankCode: string;
      companyName: string;
      gstin: string;
      contactPerson: string;
      invoiceNumber: string;
      daysPastDue: number;
      dpdBucket: InvoiceDPD;
      paymentTerms: string;
      onTimeRate: number;
      totalBusiness: number;
      poNumber: string;
      items: Array<{ description: string; quantity: number; unitPriceINR: number }>;
    }> = {
      APPROVAL_DELAY: {
        contactName: 'Rajesh Kumar',
        email: 'rajesh.kumar@finserve.in',
        phone: '+91 98201 33445',
        tier: 'GOLD',
        amount: 87500.00,
        method: 'NETBANKING',
        bankCode: 'HDFC',
        companyName: 'FinServe Solutions Pvt Ltd',
        gstin: '27AABCF9999H1Z3',
        contactPerson: 'Rajesh Kumar',
        invoiceNumber: `INV-2026-FS-${1000 + Math.floor(Math.random() * 9000)}`,
        daysPastDue: 12,
        dpdBucket: 'OVERDUE_30',
        paymentTerms: 'NET_30',
        onTimeRate: 0.85,
        totalBusiness: 2100000,
        poNumber: `PO-FS-2026-${Math.floor(Math.random() * 999)}`,
        items: [
          { description: 'SaaS Platform License (Q2 2026)', quantity: 1, unitPriceINR: 65000 },
          { description: 'Premium Support Package', quantity: 1, unitPriceINR: 22500 }
        ]
      },
      PROCUREMENT_DELAY: {
        contactName: 'Sunita Reddy',
        email: 'sunita.r@logistics.co',
        phone: '+91 97401 66778',
        tier: 'SILVER',
        amount: 145000.00,
        method: 'NETBANKING',
        bankCode: 'ICICI',
        companyName: 'Swift Logistics Corp',
        gstin: '29AABCS7777K1Z1',
        contactPerson: 'Sunita Reddy',
        invoiceNumber: `INV-2026-SL-${2000 + Math.floor(Math.random() * 9000)}`,
        daysPastDue: 28,
        dpdBucket: 'OVERDUE_30',
        paymentTerms: 'NET_30',
        onTimeRate: 0.60,
        totalBusiness: 3800000,
        poNumber: `PO-SL-2026-${Math.floor(Math.random() * 999)}`,
        items: [
          { description: 'Fleet Tracking System (Annual)', quantity: 1, unitPriceINR: 95000 },
          { description: 'GPS Device Installation (50 units)', quantity: 50, unitPriceINR: 800 },
          { description: 'Training & Onboarding', quantity: 1, unitPriceINR: 10000 }
        ]
      },
      CASHFLOW_ISSUE: {
        contactName: 'Anil Mehta',
        email: 'anil.m@manufacturing.in',
        phone: '+91 99302 88990',
        tier: 'PLATINUM',
        amount: 320000.00,
        method: 'NETBANKING',
        bankCode: 'SBI',
        companyName: 'Precision Auto Components Ltd',
        gstin: '27AABCP4444M1Z6',
        contactPerson: 'Anil Mehta',
        invoiceNumber: `INV-2026-PAC-${3000 + Math.floor(Math.random() * 9000)}`,
        daysPastDue: 72,
        dpdBucket: 'OVERDUE_90_PLUS',
        paymentTerms: 'NET_60',
        onTimeRate: 0.45,
        totalBusiness: 8200000,
        poNumber: `PO-PAC-2026-${Math.floor(Math.random() * 999)}`,
        items: [
          { description: 'Industrial IoT Platform License (Annual)', quantity: 1, unitPriceINR: 200000 },
          { description: 'On-site Implementation (8 days)', quantity: 8, unitPriceINR: 12500 },
          { description: 'Custom Sensor Integration', quantity: 1, unitPriceINR: 20000 }
        ]
      },
      ENTERPRISE_OVERDUE: {
        contactName: 'Deepa Nair',
        email: 'deepa.nair@enterprise.com',
        phone: '+91 98456 11223',
        tier: 'PLATINUM',
        amount: 580000.00,
        method: 'NETBANKING',
        bankCode: 'AXIS',
        companyName: 'GlobalTech Enterprises India',
        gstin: '29AABCG8888N1Z9',
        contactPerson: 'Deepa Nair',
        invoiceNumber: `INV-2026-GTE-${4000 + Math.floor(Math.random() * 9000)}`,
        daysPastDue: 95,
        dpdBucket: 'OVERDUE_90_PLUS',
        paymentTerms: 'NET_90',
        onTimeRate: 0.35,
        totalBusiness: 15000000,
        poNumber: '',
        items: [
          { description: 'Enterprise Cloud Migration (Phase 2)', quantity: 1, unitPriceINR: 350000 },
          { description: 'Dedicated Support Engineer (3 months)', quantity: 3, unitPriceINR: 60000 },
          { description: 'Security Audit & Compliance', quantity: 1, unitPriceINR: 30000 }
        ]
      }
    };

    const s = scenarios[scenario] || scenarios.APPROVAL_DELAY;
    const now = new Date();
    const invoiceDate = new Date(now.getTime() - (s.daysPastDue + 30) * 86400000);
    const dueDate = new Date(invoiceDate.getTime() + (s.paymentTerms === 'NET_30' ? 30 : s.paymentTerms === 'NET_60' ? 60 : s.paymentTerms === 'NET_90' ? 90 : 30) * 86400000);

    const newCase: RecoveryCase = {
      caseId,
      merchantId: 'mer_razorpay_demo',
      eventType: 'INVOICE_OVERDUE',
      status: 'DETECTED',
      amount: s.amount,
      currency: 'INR',
      riskTier: s.daysPastDue > 90 ? 'CRITICAL' : (s.daysPastDue > 60 ? 'HIGH' : (s.daysPastDue > 30 ? 'MEDIUM' : 'LOW')),
      customer: {
        id: `cust_inv_${Date.now()}`,
        name: s.contactName,
        phone: s.phone,
        email: s.email,
        clvTier: s.tier,
        historicalRecoveries: s.tier === 'PLATINUM' ? 2 : (s.tier === 'GOLD' ? 1 : 0),
        totalLifetimeSpendINR: s.totalBusiness
      },
      sourceEvent: {
        invoiceId: `inv_${Date.now()}`,
        amount: s.amount,
        currency: 'INR',
        method: s.method,
        errorCode: 'INVOICE_OVERDUE',
        errorDescription: `Invoice ${s.invoiceNumber} overdue by ${s.daysPastDue} days. Payment terms ${s.paymentTerms}. Company: ${s.companyName}.`,
        occurredAt: invoiceDate.toISOString(),
        bankCode: s.bankCode
      },
      invoiceProfile: {
        invoiceId: `inv_${Date.now()}`,
        invoiceNumber: s.invoiceNumber,
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        daysPastDue: s.daysPastDue,
        dpdBucket: s.dpdBucket,
        outstandingAmountINR: s.amount,
        originalAmountINR: s.amount,
        paymentTerms: s.paymentTerms as any,
        companyName: s.companyName,
        companyGstin: s.gstin,
        contactPerson: s.contactPerson,
        contactEmail: s.email,
        contactPhone: s.phone,
        invoiceItems: s.items,
        poNumber: s.poNumber || undefined,
        gracePeriodDays: 7,
        totalLifetimeBusinessINR: s.totalBusiness,
        historicalOnTimePaymentRate: s.onTimeRate,
        recoveryProbability: 0.70
      },
      createdAt: invoiceDate.toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.upsertCase(newCase);

    await db.addAuditLog({
      caseId: newCase.caseId,
      agentName: 'Receivables Sentinel',
      action: 'INVOICE_OVERDUE_INGESTED',
      rationale: `Overdue invoice detected: ${s.invoiceNumber} (₹${s.amount.toLocaleString('en-IN')}, ${s.daysPastDue} DPD). Company: ${s.companyName}. Contact: ${s.contactPerson}. Root cause suspected: ${scenario.replace(/_/g, ' ')}. Dispatching to Receivables Recovery Agents.`,
      model: 'receivables-sentinel',
      latencyMs: 5,
      tokensUsed: 0
    });

    pipelineJobQueue.enqueue(newCase);

    return newCase;
  }

  /**
   * Simulate a batch of overdue invoices across different DPD buckets.
   */
  public static async simulateReceivablesBatchStream(batchSize: number = 4): Promise<{
    batchId: string;
    casesCreated: RecoveryCase[];
    totalOutstandingINR: number;
  }> {
    const batchId = `INV-BATCH-${Date.now()}`;
    const scenarios: Array<'APPROVAL_DELAY' | 'PROCUREMENT_DELAY' | 'CASHFLOW_ISSUE' | 'ENTERPRISE_OVERDUE'> = [
      'APPROVAL_DELAY', 'PROCUREMENT_DELAY', 'CASHFLOW_ISSUE', 'ENTERPRISE_OVERDUE'
    ];

    const actualCount = Math.min(batchSize, scenarios.length);
    const createdCases: RecoveryCase[] = [];
    let totalOutstanding = 0;

    for (let i = 0; i < actualCount; i++) {
      const testCase = await this.simulateOverdueInvoice(scenarios[i]);
      totalOutstanding += testCase.amount;
      createdCases.push(testCase);

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return { batchId, casesCreated: createdCases, totalOutstandingINR: totalOutstanding };
  }
}
