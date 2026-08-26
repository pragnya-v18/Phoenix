/**
 * RecoverFlow AI - Voice Recovery Agent Service
 * Multi-language voice call simulation with script generation.
 * Extracted from AgentSupervisor for modularity.
 */

import { db } from '../repositories/db.js';
import { safePersistCase, safeAuditLog } from '../shared/index.js';
import {
  RecoveryCase,
  PaymentMethod,
  CheckoutStage,
  VoiceAgentProfile,
  VoiceCallOutcome,
  VoiceLanguageVariant,
  VoiceToneVariant,
  VoiceScriptSegment
} from '../../src/types/index.js';

export class VoiceAgentService {
  /**
   * Generate voice script segments for a recovery call based on event type and language variant.
   */
  public static generateVoiceScript(
    recoveryCase: RecoveryCase,
    language: VoiceLanguageVariant = 'HINGLISH',
    tone: VoiceToneVariant = 'FRIENDLY'
  ): VoiceScriptSegment[] {
    const amount = recoveryCase.amount;
    const customerName = recoveryCase.customer.name;
    const eventType = recoveryCase.eventType;

    if (eventType === 'PAYMENT_FAILED') {
      return [
        {
          segment: 'GREETING',
          textEN: `Hello ${customerName}, this is an automated call from your payment platform regarding a recent transaction.`,
          textHinglish: `Namaste ${customerName} ji, main aapki payment platform se bol raha hoon. Aapka recent transaction ka related call hai.`,
          textHindi: `नमस्ते ${customerName} जी, मैं आपकी पेमेंट प्लेटफॉर्म से बोल रहा हूँ।`
        },
        {
          segment: 'ISSUE_EXPLANATION',
          textEN: `Your payment of ₹${amount.toLocaleString('en-IN')} could not be processed. This could be due to insufficient funds, network timeout, or bank server issues.`,
          textHinglish: `Aapka ₹${amount.toLocaleString('en-IN')} ka payment process nahi ho paya. Iska reason insufficient funds, network timeout, ya bank server issue ho sakta hai.`,
          textHindi: `आपका ₹${amount.toLocaleString('en-IN')} का पेमेंट प्रोसेस नहीं हो पाया। इसका कारण insufficient funds, network timeout, या bank server issue हो सकता है।`
        },
        {
          segment: 'RECOVERY_OFFER',
          textEN: `We can retry the payment right now. I will send you a secure payment link. Would you like to proceed?`,
          textHinglish: `Hum abhi payment retry kar sakte hain. Main aapko secure payment link bhejunga. Kya aap proceed karna chahenge?`,
          textHindi: `हम अभी पेमेंट रीट्राई कर सकते हैं। मैं आपको सिक्योर पेमेंट लिंक भेजूँगा। क्या आप प्रोसीड करना चाहेंगे?`
        },
        {
          segment: 'PAYMENT_CTA',
          textEN: `I am sending the payment link to your registered number now. Please complete the payment within 30 minutes to avoid any additional charges.`,
          textHinglish: `Main aapko abhi payment link bhej raha hoon aapke registered number pe. Please 30 minute mein payment complete kar lijiye.`,
          textHindi: `मैं आपको अभी पेमेंट लिंक भेज रहा हूँ आपके रजिस्टर्ड नंबर पर। कृपया 30 मिनट में पेमेंट कंप्लीट कर लीजिए।`
        }
      ];
    }

    if (eventType === 'CHECKOUT_ABANDONED') {
      return [
        {
          segment: 'GREETING',
          textEN: `Good day ${customerName}. This is a quick call from your shopping platform. I noticed you were browsing some items.`,
          textHinglish: `Namaste ${customerName} ji. Main aapke shopping platform se bol raha hoon. Maine dekha ki aap kuch items dekh rahe the.`,
          textHindi: `नमस्ते ${customerName} जी। मैं आपके शॉपिंग प्लेटफॉर्म से बोल रहा हूँ। मैंने देखा कि आप कुछ आइटम्स देख रहे थे।`
        },
        {
          segment: 'ISSUE_EXPLANATION',
          textEN: `Your cart has items worth ₹${amount.toLocaleString('en-IN')} but the payment was not completed. Was there any issue during checkout?`,
          textHinglish: `Aapke cart mein ₹${amount.toLocaleString('en-IN')} ka samaan hai lekin payment complete nahi hua. Koi issue aaya tha kya checkout mein?`,
          textHindi: `आपके कार्ट में ₹${amount.toLocaleString('en-IN')} का सामान है लेकिन पेमेंट कंप्लीट नहीं हुआ। कोई इश्यू आया था क्या?`
        },
        {
          segment: 'RECOVERY_OFFER',
          textEN: `I can help you complete the purchase right now. We also have a special offer — 5% instant discount if you complete within 30 minutes.`,
          textHinglish: `Main aapki purchase complete karne mein help kar sakta hoon. Aur humare paas special offer hai — 5% instant discount agar aap 30 minute mein complete karein.`,
          textHindi: `मैं आपकी परचेज़ कंप्लीट करने में हेल्प कर सकता हूँ। हमारे पास स्पेशल ऑफर है — 5% इंस्टैंट डिस्काउंट अगर 30 मिनट में कंप्लीट करें।`
        },
        {
          segment: 'PAYMENT_CTA',
          textEN: `Shall I send you a secure payment link right now? You can pay via UPI, cards, or net banking.`,
          textHinglish: `Kya main aapko abhi secure payment link bhej doon? Aap UPI, card, ya net banking se pay kar sakte hain.`,
          textHindi: `क्या मैं आपको अभी सिक्योर पेमेंट लिंक भेज दूँ? आप UPI, कार्ड, या नेट बैंकिंग से पे कर सकते हैं।`
        }
      ];
    }

    // INVOICE_OVERDUE
    const invoice = recoveryCase.invoiceProfile;
    const companyName = invoice?.companyName || 'your company';
    const invoiceNumber = invoice?.invoiceNumber || 'N/A';
    const daysPastDue = invoice?.daysPastDue || 0;

    return [
      {
        segment: 'GREETING',
        textEN: `Good day. This is a call from your service provider regarding an overdue invoice for ${companyName}.`,
        textHinglish: `Namaste. Yeh aapke service provider ki taraf se call hai regarding ${companyName} ka overdue invoice.`,
        textHindi: `नमस्ते। यह आपके सर्विस प्रोवाइडर की तरफ से कॉल है ${companyName} के ओवरड्यू इनवॉइस के बारे में।`
      },
      {
        segment: 'ISSUE_EXPLANATION',
        textEN: `Invoice ${invoiceNumber} for ₹${amount.toLocaleString('en-IN')} is now ${daysPastDue} days past due. The payment was due on ${invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'a recent date'}.`,
        textHinglish: `Invoice ${invoiceNumber} jo ₹${amount.toLocaleString('en-IN')} ka hai, woh ab ${daysPastDue} days overdue hai. Payment due date thi ${invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'recent date'}.`,
        textHindi: `इनवॉइस ${invoiceNumber} जो ₹${amount.toLocaleString('en-IN')} का है, वो अब ${daysPastDue} दिन ओवरड्यू है।`
      },
      {
        segment: 'RECOVERY_OFFER',
        textEN: `We understand there may be processing delays. We can offer a 2% early settlement discount if the full amount is paid within 7 days. Would that work for you?`,
        textHinglish: `Hum samajhte hain ki processing delays ho sakti hain. Hum 2% early settlement discount de sakte hain agar poora amount 7 days mein pay ho jaye. Kya yeh aapke liye suitable hoga?`,
        textHindi: `हम समझते हैं कि प्रोसेसिंग डिले हो सकती है। हम 2% अर्ली सेटलमेंट डिस्काउंट दे सकते हैं अगर पूरा अमाउंट 7 दिन में पे हो जाए।`
      },
      {
        segment: 'PAYMENT_CTA',
        textEN: `I will send a payment link to your accounts team email right now. Please confirm the preferred payment method — NEFT, RTGS, or online payment.`,
        textHinglish: `Main aapke accounts team ko email pe payment link bhej raha hoon. Please confirm karein — NEFT, RTGS, ya online payment.`,
        textHindi: `मैं आपके अकाउंट्स टीम को ईमेल पर पेमेंट लिंक भेज रहा हूँ। कृपया कन्फर्म करें — NEFT, RTGS, या ऑनलाइन पेमेंट।`
      }
    ];
  }

  /**
   * Simulate a voice recovery call for any event type.
   * Generates script, determines outcome, and persists the case.
   */
  public static async simulateVoiceCall(
    eventType: 'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE',
    language: VoiceLanguageVariant = 'HINGLISH',
    tone: VoiceToneVariant = 'FRIENDLY',
    overrideScenario?: 'PROMISE_TO_PAY' | 'NO_ANSWER' | 'CALLBACK_REQUESTED' | 'REJECTED' | 'ANSWERED'
  ): Promise<RecoveryCase> {
    const caseId = `REC-VO-${Date.now().toString().slice(-4)}`;

    // Build a base case depending on event type
    let baseCase: RecoveryCase;

    if (eventType === 'PAYMENT_FAILED') {
      const scenarios = [
        { name: 'Amit Patel', phone: '+91 99876 54321', email: 'amit.patel@yahoo.com', tier: 'GOLD' as const, amount: 2499, bank: 'HDFC', error: 'UPI_INSUFFICIENT_FUNDS', method: 'UPI' as PaymentMethod },
        { name: 'Sneha Iyer', phone: '+91 88765 43210', email: 'sneha.iyer@gmail.com', tier: 'SILVER' as const, amount: 999, bank: 'ICICI', error: 'CARD_EXPIRED', method: 'CARD' as PaymentMethod },
        { name: 'Vikram Singh', phone: '+91 77654 32109', email: 'vikram.singh@outlook.com', tier: 'PLATINUM' as const, amount: 7999, bank: 'SBI', error: 'UPI_TIMEOUT', method: 'UPI' as PaymentMethod }
      ];
      const s = scenarios[Math.floor(Math.random() * scenarios.length)];
      baseCase = {
        caseId,
        merchantId: 'mer_razorpay_demo',
        eventType: 'PAYMENT_FAILED',
        status: 'DETECTED',
        amount: s.amount,
        currency: 'INR',
        riskTier: s.tier === 'PLATINUM' ? 'HIGH' : 'MEDIUM',
        customer: { id: `cust_vo_${Date.now()}`, name: s.name, phone: s.phone, email: s.email, clvTier: s.tier, historicalRecoveries: s.tier === 'PLATINUM' ? 3 : 1, totalLifetimeSpendINR: s.tier === 'PLATINUM' ? 180000 : 45000 },
        sourceEvent: { paymentId: `pay_vo_${Date.now()}`, amount: s.amount, currency: 'INR', method: s.method, errorCode: s.error, errorDescription: `Payment failed: ${s.error}. Voice agent initiating recovery call.`, occurredAt: new Date().toISOString(), bankCode: s.bank },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else if (eventType === 'CHECKOUT_ABANDONED') {
      const scenarios = [
        { name: 'Kavya Nair', phone: '+91 96543 21098', email: 'kavya.nair@gmail.com', tier: 'GOLD' as const, amount: 8999, stage: 'PAYMENT_PAGE' as CheckoutStage, device: 'mobile' as const },
        { name: 'Arjun Mehta', phone: '+91 85432 10987', email: 'arjun.m@outlook.com', tier: 'PLATINUM' as const, amount: 19999, stage: 'ADDRESS_PAGE' as CheckoutStage, device: 'desktop' as const },
        { name: 'Pooja Reddy', phone: '+91 74321 09876', email: 'pooja.reddy@yahoo.com', tier: 'SILVER' as const, amount: 3499, stage: 'CART_REVIEW' as CheckoutStage, device: 'mobile' as const }
      ];
      const s = scenarios[Math.floor(Math.random() * scenarios.length)];
      baseCase = {
        caseId,
        merchantId: 'mer_razorpay_demo',
        eventType: 'CHECKOUT_ABANDONED',
        status: 'DETECTED',
        amount: s.amount,
        currency: 'INR',
        riskTier: s.tier === 'PLATINUM' ? 'HIGH' : 'MEDIUM',
        customer: { id: `cust_vo_${Date.now()}`, name: s.name, phone: s.phone, email: s.email, clvTier: s.tier, historicalRecoveries: s.tier === 'PLATINUM' ? 3 : 1, totalLifetimeSpendINR: s.tier === 'PLATINUM' ? 180000 : 45000 },
        sourceEvent: { amount: s.amount, currency: 'INR', method: 'UPI', errorCode: 'CHECKOUT_ABANDONED', errorDescription: `Checkout abandoned at ${s.stage}. Voice agent initiating recovery call.`, occurredAt: new Date().toISOString(), bankCode: 'HDFC' },
        checkoutProfile: { checkoutId: `chk_vo_${Date.now()}`, sessionId: `sess_vo_${Date.now()}`, abandonedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString(), stageReached: s.stage, cartValueINR: s.amount, cartItems: [{ name: 'Simulated Item', quantity: 1, priceINR: s.amount }], totalCartItems: 1, deviceType: s.device, browserSessionDurationSec: 300, previousVisitCount: 1, recoveryProbability: 0.75 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      // INVOICE_OVERDUE
      const scenarios = [
        { name: 'Rajesh Kumar', company: 'FinServe Solutions Pvt Ltd', phone: '+91 98201 33445', email: 'rajesh.kumar@finserve.in', tier: 'GOLD' as const, amount: 87500, dpd: 15, bank: 'HDFC' },
        { name: 'Sunita Reddy', company: 'Swift Logistics Corp', phone: '+91 97401 66778', email: 'sunita.r@logistics.co', tier: 'SILVER' as const, amount: 145000, dpd: 45, bank: 'ICICI' },
        { name: 'Deepa Nair', company: 'GlobalTech Enterprises India', phone: '+91 98456 11223', email: 'deepa.nair@enterprise.com', tier: 'PLATINUM' as const, amount: 580000, dpd: 90, bank: 'AXIS' }
      ];
      const s = scenarios[Math.floor(Math.random() * scenarios.length)];
      const invDate = new Date(Date.now() - (s.dpd + 30) * 86400000);
      const dueDate = new Date(invDate.getTime() + 30 * 86400000);
      baseCase = {
        caseId,
        merchantId: 'mer_razorpay_demo',
        eventType: 'INVOICE_OVERDUE',
        status: 'DETECTED',
        amount: s.amount,
        currency: 'INR',
        riskTier: s.dpd > 60 ? 'CRITICAL' : 'HIGH',
        customer: { id: `cust_vo_${Date.now()}`, name: s.name, phone: s.phone, email: s.email, clvTier: s.tier, historicalRecoveries: s.tier === 'PLATINUM' ? 2 : 0, totalLifetimeSpendINR: s.tier === 'PLATINUM' ? 8000000 : 2000000 },
        sourceEvent: { invoiceId: `inv_vo_${Date.now()}`, amount: s.amount, currency: 'INR', method: 'NETBANKING', errorCode: 'INVOICE_OVERDUE', errorDescription: `Invoice overdue ${s.dpd} days. Voice agent initiating recovery call.`, occurredAt: invDate.toISOString(), bankCode: s.bank },
        invoiceProfile: { invoiceId: `inv_vo_${Date.now()}`, invoiceNumber: `INV-2026-VO-${1000 + Math.floor(Math.random() * 9000)}`, invoiceDate: invDate.toISOString(), dueDate: dueDate.toISOString(), daysPastDue: s.dpd, dpdBucket: s.dpd > 60 ? 'OVERDUE_90_PLUS' : 'OVERDUE_30', outstandingAmountINR: s.amount, originalAmountINR: s.amount, paymentTerms: 'NET_30', companyName: s.company, companyGstin: '27AABCT9999H1Z3', contactPerson: s.name, contactEmail: s.email, contactPhone: s.phone, invoiceItems: [{ description: 'Service Invoice', quantity: 1, unitPriceINR: s.amount }], gracePeriodDays: 7, totalLifetimeBusinessINR: s.tier === 'PLATINUM' ? 8000000 : 2000000, historicalOnTimePaymentRate: 0.70, recoveryProbability: 0.75 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Generate voice script
    const scriptSegments = this.generateVoiceScript(baseCase, language, tone);

    // Determine call outcome
    const outcomes: VoiceCallOutcome[] = ['ANSWERED', 'NO_ANSWER', 'CALLBACK_REQUESTED', 'PROMISE_TO_PAY', 'REJECTED'];
    const outcome = overrideScenario || outcomes[Math.floor(Math.random() * outcomes.length)];

    // Build voice profile
    const callStart = new Date();
    const callDuration = outcome === 'NO_ANSWER' ? 0 : Math.floor(Math.random() * 240) + 60;
    const callEnd = new Date(callStart.getTime() + callDuration * 1000);
    const retryCount = outcome === 'NO_ANSWER' ? Math.floor(Math.random() * 3) + 1 : 1;

    const voiceProfile: VoiceAgentProfile = {
      agentId: `voice-agent-${Date.now()}`,
      caseId,
      phoneNumber: baseCase.customer.phone,
      callerName: baseCase.customer.name,
      languageVariant: language,
      toneVariant: tone,
      scriptSegments,
      retryCount,
      maxRetries: 3,
      callStartedAt: callStart.toISOString(),
      callEndedAt: callEnd.toISOString(),
      callDurationSeconds: callDuration,
      outcome,
      outcomeReason: outcome === 'PROMISE_TO_PAY' ? 'Customer promised to complete payment within agreed timeframe.'
        : outcome === 'CALLBACK_REQUESTED' ? 'Customer requested callback at a more convenient time.'
        : outcome === 'REJECTED' ? 'Customer declined to make payment.'
        : outcome === 'ANSWERED' ? 'Customer acknowledged the issue but did not commit to payment.'
        : 'No answer after multiple attempts.',
      promisedPaymentDate: outcome === 'PROMISE_TO_PAY' ? new Date(Date.now() + 86400000 * 3).toISOString() : undefined,
      promisedAmountINR: outcome === 'PROMISE_TO_PAY' ? baseCase.amount : undefined,
      dnis: '1800123456',
      ani: baseCase.customer.phone,
      campaignId: `CAMP-VO-${Date.now()}`
    };

    baseCase.voiceProfile = voiceProfile;
    baseCase.status = outcome === 'PROMISE_TO_PAY' ? 'RECOVERED' : outcome === 'NO_ANSWER' ? 'FOLLOWING_UP' : 'DIAGNOSING';
    baseCase.updatedAt = new Date().toISOString();

    // Set outcome if recovered
    if (outcome === 'PROMISE_TO_PAY') {
      baseCase.outcome = {
        isRecovered: true,
        recoveredAmount: baseCase.amount,
        settledPaymentId: `pay_vo_${Date.now()}_settled`,
        reconciliationMethod: 'VOICE_PROMISE_TO_PAY',
        recoveredAt: callEnd.toISOString(),
        timeToRecoverSeconds: callDuration,
        attributedChannel: `VOICE_${language}`,
        costOfIncentiveINR: 0,
        estimatedMdrFeeINR: baseCase.amount * 0.003,
        mdrRatePct: 0.3,
        businessInsights: `Recovered ₹${baseCase.amount.toLocaleString('en-IN')} via ${language} voice call. Outcome: Promise to Pay. Call duration: ${callDuration}s.`
      };
    }

    // Set strategy
    baseCase.strategy = {
      recommendedAction: 'VOICE_CALL',
      targetChannel: 'VOICE',
      offeredDiscountPct: 0,
      calculatedIncentiveINR: 0,
      delayMinutes: 0,
      reasoning: `Voice recovery call initiated for ${eventType} case. Language: ${language}. Tone: ${tone}. Expected outcome based on CLV tier ${baseCase.customer.clvTier}.`,
      expectedRecoveryProbability: outcome === 'PROMISE_TO_PAY' ? 0.90 : 0.45,
      scheduledExecutionAt: new Date().toISOString()
    };

    // Set compliance
    baseCase.compliance = {
      approved: true,
      rulesPassed: ['TRAI_QUIET_HOURS_OK', 'VOICE_CALL_CONSENT_OBTAINED', 'DO_NOT_DISTURB_CLEAR'],
      violations: [],
      requiresHumanApproval: false,
      evaluatedAt: new Date().toISOString()
    };

    // Persist
    await safePersistCase(baseCase);

    // Audit log
    await safeAuditLog({
      caseId,
      agentName: 'Voice Recovery Agent',
      action: outcome === 'PROMISE_TO_PAY' ? 'PROMISE_TO_PAY_CAPTURED' : 'VOICE_CALL_COMPLETED',
      rationale: `${language} voice call to ${baseCase.customer.name} (${baseCase.customer.phone}) for ₹${baseCase.amount.toLocaleString('en-IN')} ${eventType} case. Outcome: ${outcome}. Language: ${language}. Tone: ${tone}. Duration: ${callDuration}s.`,
      model: 'voice-agent-gemini',
      latencyMs: 180,
      tokensUsed: scriptSegments.length * 80
    });

    return baseCase;
  }

  /**
   * Simulate a batch of voice calls across event types and languages.
   */
  public static async simulateVoiceBatch(
    batchSize: number = 4
  ): Promise<{ batchId: string; casesCreated: RecoveryCase[]; totalCallValueINR: number }> {
    const batchId = `VO-BATCH-${Date.now()}`;
    const eventTypes: Array<'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE'> = [
      'PAYMENT_FAILED', 'CHECKOUT_ABANDONED', 'INVOICE_OVERDUE', 'PAYMENT_FAILED'
    ];
    const languages: VoiceLanguageVariant[] = ['HINGLISH', 'ENGLISH', 'HINDI', 'HINGLISH'];
    const tones: VoiceToneVariant[] = ['FRIENDLY', 'PROFESSIONAL', 'EMPATHETIC', 'URGENT'];

    const actualCount = Math.min(batchSize, eventTypes.length);
    const createdCases: RecoveryCase[] = [];
    let totalValue = 0;

    for (let i = 0; i < actualCount; i++) {
      const testCase = await this.simulateVoiceCall(eventTypes[i], languages[i], tones[i]);
      totalValue += testCase.amount;
      createdCases.push(testCase);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return { batchId, casesCreated: createdCases, totalCallValueINR: totalValue };
  }
}
