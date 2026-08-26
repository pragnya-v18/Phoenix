/**
 * RecoverFlow AI - KPI Engine
 * Computes ExecutiveKPIs, channel metrics, root cause analytics, checkout
 * abandonment metrics, B2B receivables metrics, and voice analytics from
 * the in-memory case cache.
 * Extracted from FirestoreDatabase for modularity.
 */

import {
  RecoveryCase,
  ExecutiveKPIs,
  ChannelRecoveryMetric,
  RootCauseRecoveryMetric,
  CheckoutAbandonmentMetrics,
  CheckoutStage,
  B2BReceivablesMetrics,
  InvoiceDPD,
  VoiceAnalytics,
  VoiceLanguageVariant,
  VoiceCallOutcome,
  ChannelType
} from '../../src/types/index.js';
import { FinancialAccountingEngine } from './financials.js';

const netRecoveredAmount = (c: RecoveryCase): number => {
  const gross = c.outcome?.recoveredAmount || c.amount;
  const refund = c.refundState?.isRefunded ? (c.refundState.refundAmountINR || 0) : 0;
  return Math.max(0, gross - refund);
};

export function computeKPIs(allCases: RecoveryCase[]): ExecutiveKPIs {
  let totalRevenueAtRisk = 0;
  let totalRevenueRecovered = 0;
  let recoveredCount = 0;
  let failedCount = 0;
  let cooldownProtectedCount = 0;
  let outagePausedCount = 0;
  let totalRecoveryTimeSec = 0;
  let totalIncentiveCost = 0;
  let totalRecoveryOpsCost = 0;
  let totalMdrFees = 0;

  const channelMap = new Map<string, {
    channel: string;
    channelName: string;
    attempted: number;
    recovered: number;
    revenueAtRisk: number;
    revenueRecovered: number;
    totalTimeSec: number;
    incentiveCost: number;
    opsCost: number;
    mdrFee: number;
  }>();

  const rootCauseMap = new Map<string, {
    rootCause: string;
    rootCauseLabel: string;
    totalCases: number;
    recoveredCases: number;
    revenueAtRisk: number;
    revenueRecovered: number;
  }>();

  const channelMeta: Record<string, { name: string; costPerAttempt: number }> = {
    'WHATSAPP': { name: 'WhatsApp Business (Cloud API Interactive)', costPerAttempt: 2.85 },
    'ACP_A2A': { name: 'ACP 2.0 Autonomous Agent-to-Agent', costPerAttempt: 1.20 },
    'SMS': { name: 'SMS Smart Link Routing', costPerAttempt: 0.45 },
    'EMAIL': { name: 'Email Concierge / Invoice', costPerAttempt: 0.15 },
    'DIRECT_RETRY': { name: 'Zero-Touch Switch Retry', costPerAttempt: 0.25 },
    'VOICE': { name: 'AI Voice Concierge', costPerAttempt: 4.50 },
    'VOICE_CALL': { name: 'AI Voice Concierge', costPerAttempt: 4.50 }
  };

  const rootCauseLabels: Record<string, string> = {
    'LIMIT_EXCEEDED': 'UPI / Daily Ticket Limit Exceeded',
    'ISSUER_DOWNTIME': 'Issuer Bank Switch Degraded / Outage',
    'MANDATE_EXPIRED': 'e-Mandate / Recurring Token Expired',
    'CUSTOMER_FRICTION': 'Customer Checkout Friction / Dropoff',
    'INSUFFICIENT_FUNDS': 'Insufficient Balance at Issuing Bank',
    'AUTH_TIMEOUT': 'Bank Gateway 2FA / OTP Timeout',
    'GATEWAY_ERROR': 'Payment Gateway Internal Rail Error'
  };

  for (const c of allCases) {
    totalRevenueAtRisk += c.amount;

    if (c.status === 'COOLDOWN_PROTECTED' || c.cooldownStatus?.isCoolingDown) {
      cooldownProtectedCount++;
    }
    if (c.status === 'OUTAGE_PAUSED' || c.outageStatus?.isOutageBlocked) {
      outagePausedCount++;
    }

    const rawChannel = (c.outcome?.attributedChannel?.split('_')[0] || c.strategy?.targetChannel || 'WHATSAPP').toUpperCase();
    const channelKey = channelMeta[rawChannel] ? rawChannel : 'WHATSAPP';
    const channelConfig = channelMeta[channelKey] || { name: channelKey, costPerAttempt: 1.50 };

    const agentComputeCost = 0.85;
    const caseOpsCost = channelConfig.costPerAttempt + agentComputeCost;
    totalRecoveryOpsCost += caseOpsCost;

    if (!channelMap.has(channelKey)) {
      channelMap.set(channelKey, {
        channel: channelKey,
        channelName: channelConfig.name,
        attempted: 0,
        recovered: 0,
        revenueAtRisk: 0,
        revenueRecovered: 0,
        totalTimeSec: 0,
        incentiveCost: 0,
        opsCost: 0,
        mdrFee: 0
      });
    }
    const chData = channelMap.get(channelKey)!;
    chData.attempted += 1;
    chData.revenueAtRisk += c.amount;
    chData.opsCost += caseOpsCost;

    const rcCategory = c.diagnosis?.rootCauseCategory || 'ISSUER_DOWNTIME';
    if (!rootCauseMap.has(rcCategory)) {
      rootCauseMap.set(rcCategory, {
        rootCause: rcCategory,
        rootCauseLabel: rootCauseLabels[rcCategory] || rcCategory,
        totalCases: 0,
        recoveredCases: 0,
        revenueAtRisk: 0,
        revenueRecovered: 0
      });
    }
    const rcData = rootCauseMap.get(rcCategory)!;
    rcData.totalCases += 1;
    rcData.revenueAtRisk += c.amount;

    if (c.status === 'RECOVERED') {
      const grossAmount = c.outcome?.recoveredAmount || c.amount;
      const refundDeduction = c.refundState?.isRefunded ? (c.refundState.refundAmountINR || 0) : 0;
      const recAmount = Math.max(0, grossAmount - refundDeduction);
      const incCost = c.outcome?.costOfIncentiveINR || c.strategy?.calculatedIncentiveINR || 0;
      const timeSec = c.outcome?.timeToRecoverSeconds || 120;

      const method = c.sourceEvent.method || 'CARD';
      const mdrCalc = FinancialAccountingEngine.calculateMDRFee(recAmount, method, recAmount >= 25000);
      const mdrFee = c.outcome?.estimatedMdrFeeINR !== undefined ? c.outcome.estimatedMdrFeeINR : mdrCalc.totalMdrFeeINR;

      totalRevenueRecovered += recAmount;
      totalIncentiveCost += incCost;
      totalRecoveryTimeSec += timeSec;
      totalMdrFees += mdrFee;
      recoveredCount++;

      chData.recovered += 1;
      chData.revenueRecovered += recAmount;
      chData.incentiveCost += incCost;
      chData.totalTimeSec += timeSec;
      chData.mdrFee += mdrFee;

      rcData.recoveredCases += 1;
      rcData.revenueRecovered += recAmount;
    } else if (c.status === 'FAILED' || c.status === 'DISMISSED') {
      failedCount++;
    }
  }

  const activeCases = allCases.filter(c => c.status !== 'RECOVERED' && c.status !== 'FAILED' && c.status !== 'DISMISSED');
  const recoveryRate = totalRevenueAtRisk > 0 ? (totalRevenueRecovered / totalRevenueAtRisk) * 100 : 0;
  const avgTimeSeconds = recoveredCount > 0 ? Math.round(totalRecoveryTimeSec / recoveredCount) : 135;
  const avgTimeMinutes = Number((avgTimeSeconds / 60).toFixed(1));

  const totalDeductions = totalIncentiveCost + totalRecoveryOpsCost + totalMdrFees;
  const netRevenueSaved = Math.max(0, totalRevenueRecovered - totalDeductions);
  const recoveryROI = totalDeductions > 0 ? Number((netRevenueSaved / totalDeductions).toFixed(1)) : 14.8;

  const channelMetrics: ChannelRecoveryMetric[] = Array.from(channelMap.values()).map(ch => {
    const chRecoveryRate = ch.attempted > 0 ? Number(((ch.recovered / ch.attempted) * 100).toFixed(1)) : 0;
    const chAvgTime = ch.recovered > 0 ? Math.round(ch.totalTimeSec / ch.recovered) : 120;
    const chTotalCost = ch.incentiveCost + ch.opsCost + ch.mdrFee;
    const chNetSaved = Math.max(0, ch.revenueRecovered - chTotalCost);
    const chRoi = chTotalCost > 0 ? Number((chNetSaved / chTotalCost).toFixed(1)) : 12.0;

    return {
      channel: ch.channel as ChannelType,
      channelName: ch.channelName,
      attemptedCases: ch.attempted,
      recoveredCases: ch.recovered,
      revenueAtRiskINR: Math.round(ch.revenueAtRisk),
      revenueRecoveredINR: Math.round(ch.revenueRecovered),
      channelRecoveryRatePct: chRecoveryRate,
      avgRecoveryTimeSec: chAvgTime,
      totalIncentiveINR: Math.round(ch.incentiveCost),
      totalRecoveryCostINR: Math.round(ch.opsCost),
      totalMdrFeeINR: Math.round(ch.mdrFee),
      netRevenueSavedINR: Math.round(chNetSaved),
      roiMultiplier: chRoi
    };
  }).sort((a, b) => b.revenueRecoveredINR - a.revenueRecoveredINR);

  const rootCauseMetrics: RootCauseRecoveryMetric[] = Array.from(rootCauseMap.values()).map(rc => ({
    rootCause: rc.rootCause,
    rootCauseLabel: rc.rootCauseLabel,
    totalCases: rc.totalCases,
    recoveredCases: rc.recoveredCases,
    revenueAtRiskINR: Math.round(rc.revenueAtRisk),
    revenueRecoveredINR: Math.round(rc.revenueRecovered),
    recoveryRatePct: rc.totalCases > 0 ? Number(((rc.recoveredCases / rc.totalCases) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.revenueAtRiskINR - a.revenueAtRiskINR);

  // ===================================================================
  // CHECKOUT ABANDONMENT RECOVERY METRICS
  // ===================================================================
  const checkoutCases = allCases.filter(c => c.eventType === 'CHECKOUT_ABANDONED');
  const checkoutAbandonedCount = checkoutCases.length;
  const checkoutRecoveredCases = checkoutCases.filter(c => c.status === 'RECOVERED');
  const checkoutRecoveredCount = checkoutRecoveredCases.length;
  const checkoutAtRiskGMV = checkoutCases.reduce((sum, c) => sum + c.amount, 0);
  const checkoutRecoveredGMV = checkoutRecoveredCases.reduce((sum, c) => sum + netRecoveredAmount(c), 0);
  const checkoutRecoveryRate = checkoutAbandonedCount > 0 ? Number(((checkoutRecoveredCount / checkoutAbandonedCount) * 100).toFixed(1)) : 0;
  const checkoutAvgTimeSec = checkoutRecoveredCount > 0
    ? Math.round(checkoutRecoveredCases.reduce((sum, c) => sum + (c.outcome?.timeToRecoverSeconds || 120), 0) / checkoutRecoveredCount)
    : 180;

  const stageLabels: Record<string, string> = {
    'CART_VIEW': 'Cart Review',
    'ADDRESS_ENTRY': 'Address Entry',
    'PAYMENT_SELECTION': 'Payment Selection',
    'PAYMENT_AUTHORIZATION': 'Payment Authorization',
    'OTP_ENTRY': 'OTP / 2FA Entry',
    'FAILED': 'Failed at Checkout'
  };

  const stageMap = new Map<string, { abandoned: number; recovered: number; atRisk: number; recoveredGmv: number }>();
  const deviceMap = new Map<string, { abandoned: number; recovered: number }>();
  const checkoutChannelMap = new Map<string, { attempted: number; recovered: number; gmvRecovered: number }>();

  for (const c of checkoutCases) {
    const stage = c.checkoutProfile?.stageReached || 'PAYMENT_SELECTION';
    const device = c.checkoutProfile?.deviceType || 'mobile';
    const channel = (c.outcome?.attributedChannel?.split('_')[0] || c.strategy?.targetChannel || 'WHATSAPP').toUpperCase();

    if (!stageMap.has(stage)) stageMap.set(stage, { abandoned: 0, recovered: 0, atRisk: 0, recoveredGmv: 0 });
    const sd = stageMap.get(stage)!;
    sd.abandoned++;
    sd.atRisk += c.amount;
    if (c.status === 'RECOVERED') {
      sd.recovered++;
      sd.recoveredGmv += netRecoveredAmount(c);
    }

    if (!deviceMap.has(device)) deviceMap.set(device, { abandoned: 0, recovered: 0 });
    const dd = deviceMap.get(device)!;
    dd.abandoned++;
    if (c.status === 'RECOVERED') dd.recovered++;

    if (!checkoutChannelMap.has(channel)) checkoutChannelMap.set(channel, { attempted: 0, recovered: 0, gmvRecovered: 0 });
    const cd = checkoutChannelMap.get(channel)!;
    cd.attempted++;
    if (c.status === 'RECOVERED') {
      cd.recovered++;
      cd.gmvRecovered += netRecoveredAmount(c);
    }
  }

  const checkoutMetrics: CheckoutAbandonmentMetrics = {
    totalAbandonedCheckouts: checkoutAbandonedCount,
    totalRecoveredCheckouts: checkoutRecoveredCount,
    checkoutRecoveryRatePct: checkoutRecoveryRate,
    recoveredGMV_INR: Math.round(checkoutRecoveredGMV),
    totalAtRiskGMV_INR: Math.round(checkoutAtRiskGMV),
    avgRecoveryTimeMinutes: Number((checkoutAvgTimeSec / 60).toFixed(1)),
    stageBreakdown: Array.from(stageMap.entries()).map(([stage, data]) => ({
      stage: stage as CheckoutStage,
      stageLabel: stageLabels[stage] || stage,
      abandonedCount: data.abandoned,
      recoveredCount: data.recovered,
      recoveryRatePct: data.abandoned > 0 ? Number(((data.recovered / data.abandoned) * 100).toFixed(1)) : 0,
      gmvAtRiskINR: Math.round(data.atRisk),
      gmvRecoveredINR: Math.round(data.recoveredGmv)
    })).sort((a, b) => b.gmvAtRiskINR - a.gmvAtRiskINR),
    channelBreakdown: Array.from(checkoutChannelMap.entries()).map(([channel, data]) => ({
      channel,
      attempted: data.attempted,
      recovered: data.recovered,
      recoveryRatePct: data.attempted > 0 ? Number(((data.recovered / data.attempted) * 100).toFixed(1)) : 0,
      gmvRecoveredINR: Math.round(data.gmvRecovered)
    })).sort((a, b) => b.gmvRecoveredINR - a.gmvRecoveredINR),
    deviceBreakdown: Array.from(deviceMap.entries()).map(([device, data]) => ({
      device,
      abandonedCount: data.abandoned,
      recoveredCount: data.recovered,
      recoveryRatePct: data.abandoned > 0 ? Number(((data.recovered / data.abandoned) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.abandonedCount - a.abandonedCount)
  };

  // ===================================================================
  // B2B RECEIVABLES RECOVERY METRICS
  // ===================================================================
  const invoiceCases = allCases.filter(c => c.eventType === 'INVOICE_OVERDUE');
  const invoiceRecoveredCases = invoiceCases.filter(c => c.status === 'RECOVERED');
  const invoiceTotalCount = invoiceCases.length;
  const invoiceRecoveredCount = invoiceRecoveredCases.length;
  const invoiceOutstandingINR = invoiceCases.reduce((sum, c) => sum + c.amount, 0);
  const invoiceRecoveredINR = invoiceRecoveredCases.reduce((sum, c) => sum + netRecoveredAmount(c), 0);
  const invoiceRecoveryRate = invoiceTotalCount > 0 ? Number(((invoiceRecoveredCount / invoiceTotalCount) * 100).toFixed(1)) : 0;
  const invoiceAvgDaysToCollect = invoiceRecoveredCount > 0
    ? Math.round(invoiceRecoveredCases.reduce((sum, c) => sum + (c.outcome?.timeToRecoverSeconds || 86400) / 86400, 0) / invoiceRecoveredCount)
    : 12;

  let ptpTotal = 0;
  let ptpKept = 0;
  for (const c of invoiceCases) {
    if ((c as any).promiseToPay) {
      ptpTotal++;
      if ((c as any).promiseToPay.status === 'KEPT') ptpKept++;
    }
  }
  const ptpConversionRate = ptpTotal > 0 ? Number(((ptpKept / ptpTotal) * 100).toFixed(1)) : 0;

  const agingMap = new Map<string, { count: number; recovered: number; outstanding: number; recoveredAmt: number }>();
  const causeMap = new Map<string, { count: number; recovered: number }>();
  const agingLabels: Record<string, string> = {
    'CURRENT': 'Current (0 DPD)',
    'OVERDUE_30': '1-30 Days Past Due',
    'OVERDUE_60': '31-60 Days Past Due',
    'OVERDUE_90_PLUS': '90+ Days Past Due'
  };
  const causeLabels: Record<string, string> = {
    'INVOICE_APPROVAL_DELAY': 'Approval Delay',
    'INVOICE_PROCUREMENT_DELAY': 'Procurement Delay',
    'INVOICE_CASHFLOW_ISSUE': 'Cash Flow Issue',
    'INVOICE_DISPUTE': 'Invoice Dispute',
    'INVOICE_MISSING_PO': 'Missing PO',
    'INVOICE_UNKNOWN': 'Unknown / Other'
  };

  for (const c of invoiceCases) {
    const dpdBucket = c.invoiceProfile?.dpdBucket || 'OVERDUE_30';
    if (!agingMap.has(dpdBucket)) agingMap.set(dpdBucket, { count: 0, recovered: 0, outstanding: 0, recoveredAmt: 0 });
    const ad = agingMap.get(dpdBucket)!;
    ad.count++;
    ad.outstanding += c.amount;
    if (c.status === 'RECOVERED') {
      ad.recovered++;
      ad.recoveredAmt += netRecoveredAmount(c);
    }

    const cause = c.diagnosis?.rootCauseCategory || 'INVOICE_UNKNOWN';
    if (!causeMap.has(cause)) causeMap.set(cause, { count: 0, recovered: 0 });
    const cd = causeMap.get(cause)!;
    cd.count++;
    if (c.status === 'RECOVERED') cd.recovered++;
  }

  const receivablesMetrics: B2BReceivablesMetrics = {
    totalOverdueInvoices: invoiceTotalCount,
    totalRecoveredInvoices: invoiceRecoveredCount,
    receivablesRecoveryRatePct: invoiceRecoveryRate,
    totalOutstandingINR: Math.round(invoiceOutstandingINR),
    totalRecoveredINR: Math.round(invoiceRecoveredINR),
    avgDaysToCollect: invoiceAvgDaysToCollect,
    promiseToPayCount: ptpTotal,
    promiseToPayConversionRatePct: ptpConversionRate,
    agingBreakdown: Array.from(agingMap.entries()).map(([bucket, data]) => ({
      bucket: bucket as InvoiceDPD,
      bucketLabel: agingLabels[bucket] || bucket,
      invoiceCount: data.count,
      recoveredCount: data.recovered,
      outstandingINR: Math.round(data.outstanding),
      recoveredINR: Math.round(data.recoveredAmt),
      recoveryRatePct: data.count > 0 ? Number(((data.recovered / data.count) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.outstandingINR - a.outstandingINR),
    rootCauseBreakdown: Array.from(causeMap.entries()).map(([cause, data]) => ({
      cause,
      causeLabel: causeLabels[cause] || cause,
      invoiceCount: data.count,
      recoveredCount: data.recovered,
      recoveryRatePct: data.count > 0 ? Number(((data.recovered / data.count) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.invoiceCount - a.invoiceCount)
  };

  // ================================================================
  // VOICE RECOVERY AGENT ANALYTICS
  // ================================================================
  const voiceCases = allCases.filter(c => c.voiceProfile);
  const totalCallsPlaced = voiceCases.reduce((sum, c) => {
    const v = c.voiceProfile!;
    return sum + (v.retryCount > 0 ? v.retryCount : (v.outcome ? 1 : 0));
  }, 0);
  const totalCallsAnswered = voiceCases.filter(c => c.voiceProfile?.outcome === 'ANSWERED' || c.voiceProfile?.outcome === 'PROMISE_TO_PAY' || c.voiceProfile?.outcome === 'CALLBACK_REQUESTED' || c.voiceProfile?.outcome === 'REJECTED').length;
  const totalCallsNoAnswer = voiceCases.filter(c => c.voiceProfile?.outcome === 'NO_ANSWER').length;
  const totalCallbacksRequested = voiceCases.filter(c => c.voiceProfile?.outcome === 'CALLBACK_REQUESTED').length;
  const totalPromisesToPay = voiceCases.filter(c => c.voiceProfile?.outcome === 'PROMISE_TO_PAY').length;
  const totalRejected = voiceCases.filter(c => c.voiceProfile?.outcome === 'REJECTED').length;
  const voiceRecoveredCases = voiceCases.filter(c => c.voiceProfile?.outcome === 'PROMISE_TO_PAY' && c.outcome?.isRecovered);
  const voiceRecoveredAmount = voiceRecoveredCases.reduce((sum, c) => sum + (c.outcome?.recoveredAmount || 0), 0);
  const callSuccessRate = totalCallsPlaced > 0 ? Number(((totalCallsAnswered / totalCallsPlaced) * 100).toFixed(1)) : 0;
  const callbackConversion = totalCallsAnswered > 0 ? Number(((totalCallbacksRequested / totalCallsAnswered) * 100).toFixed(1)) : 0;
  const ptpConversion = totalCallsAnswered > 0 ? Number(((totalPromisesToPay / totalCallsAnswered) * 100).toFixed(1)) : 0;
  const avgCallDuration = voiceCases.filter(c => c.voiceProfile?.callDurationSeconds).reduce((sum, c) => sum + (c.voiceProfile!.callDurationSeconds || 0), 0) / (voiceCases.filter(c => c.voiceProfile?.callDurationSeconds).length || 1);
  const totalCallCost = voiceCases.reduce((sum, c) => {
    const dur = c.voiceProfile?.callDurationSeconds || 0;
    return sum + (dur * 0.002);
  }, 0);
  const avgCostPerCall = totalCallsPlaced > 0 ? Number((totalCallCost / totalCallsPlaced).toFixed(2)) : 0;
  const costPerRecovery = voiceRecoveredCases.length > 0 ? Number((totalCallCost / voiceRecoveredCases.length).toFixed(2)) : 0;

  const langMap = new Map<VoiceLanguageVariant, { calls: number; answered: number; ptp: number }>();
  const outcomeMap = new Map<VoiceCallOutcome, number>();
  let totalRetrySum = 0;
  let firstAttemptSuccesses = 0;
  let retrySuccesses = 0;

  for (const c of voiceCases) {
    const v = c.voiceProfile!;
    if (v.outcome) {
      outcomeMap.set(v.outcome, (outcomeMap.get(v.outcome) || 0) + 1);
    }
    const lang = v.languageVariant;
    const existing = langMap.get(lang) || { calls: 0, answered: 0, ptp: 0 };
    existing.calls++;
    if (v.outcome === 'ANSWERED' || v.outcome === 'PROMISE_TO_PAY' || v.outcome === 'CALLBACK_REQUESTED' || v.outcome === 'REJECTED') {
      existing.answered++;
    }
    if (v.outcome === 'PROMISE_TO_PAY') {
      existing.ptp++;
    }
    langMap.set(lang, existing);
    totalRetrySum += v.retryCount;
    if (v.retryCount <= 1 && (v.outcome === 'PROMISE_TO_PAY' || v.outcome === 'ANSWERED')) {
      firstAttemptSuccesses++;
    }
    if (v.retryCount > 1 && (v.outcome === 'PROMISE_TO_PAY' || v.outcome === 'ANSWERED')) {
      retrySuccesses++;
    }
  }

  const firstAttemptSuccessPct = totalCallsPlaced > 0 ? Number(((firstAttemptSuccesses / totalCallsPlaced) * 100).toFixed(1)) : 0;
  const retrySuccessPct = totalCallsPlaced > 0 ? Number(((retrySuccesses / totalCallsPlaced) * 100).toFixed(1)) : 0;
  const avgRetriesBeforeAnswer = voiceCases.length > 0 ? Number((totalRetrySum / voiceCases.length).toFixed(1)) : 0;

  const langLabels: Record<VoiceLanguageVariant, string> = { ENGLISH: 'English', HINGLISH: 'Hinglish', HINDI: 'Hindi' };
  const outcomeLabels: Record<VoiceCallOutcome, string> = {
    ANSWERED: 'Answered', NO_ANSWER: 'No Answer', CALLBACK_REQUESTED: 'Callback Requested',
    PROMISE_TO_PAY: 'Promise to Pay', REJECTED: 'Rejected'
  };

  const voiceMetrics: VoiceAnalytics = {
    totalCallsPlaced,
    totalCallsAnswered,
    totalCallsNoAnswer,
    totalCallbacksRequested,
    totalPromisesToPay,
    totalRejected,
    callSuccessRatePct: callSuccessRate,
    callbackConversionRatePct: callbackConversion,
    promiseToPayConversionRatePct: ptpConversion,
    avgCallDurationSeconds: Math.round(avgCallDuration),
    totalCallCostINR: Math.round(totalCallCost * 100) / 100,
    avgCostPerCallINR: avgCostPerCall,
    revenueRecoveredViaVoiceINR: Math.round(voiceRecoveredAmount),
    costPerRecoveryINR: costPerRecovery,
    languageBreakdown: Array.from(langMap.entries()).map(([variant, data]) => ({
      variant,
      label: langLabels[variant],
      callCount: data.calls,
      successRatePct: data.calls > 0 ? Number(((data.answered / data.calls) * 100).toFixed(1)) : 0,
      ptpRatePct: data.calls > 0 ? Number(((data.ptp / data.calls) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.callCount - a.callCount),
    outcomeBreakdown: Array.from(outcomeMap.entries()).map(([outcome, count]) => ({
      outcome,
      label: outcomeLabels[outcome],
      count,
      pct: totalCallsPlaced > 0 ? Number(((count / totalCallsPlaced) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.count - a.count),
    retryStats: {
      avgRetriesBeforeAnswer,
      firstAttemptSuccessPct,
      retrySuccessPct
    }
  };

  return {
    totalRevenueAtRiskINR: Math.round(totalRevenueAtRisk),
    totalRevenueRecoveredINR: Math.round(totalRevenueRecovered),
    recoveryRatePercentage: Number(recoveryRate.toFixed(1)),

    totalCasesCount: allCases.length,
    activeCasesCount: activeCases.length,
    recoveredCasesCount: recoveredCount,
    failedCasesCount: failedCount,
    cooldownProtectedCount,
    outagePausedCount,
    avgRecoveryTimeMinutes: avgTimeMinutes,
    avgRecoveryTimeSeconds: avgTimeSeconds,

    totalIncentiveCostINR: Math.round(totalIncentiveCost),
    totalRecoveryCostINR: Math.round(totalRecoveryOpsCost),
    totalMdrFeesINR: Math.round(totalMdrFees),
    netRevenueSavedINR: Math.round(netRevenueSaved),
    recoveryROI: recoveryROI,
    recoveredArrProjectedINR: Math.round(totalRevenueRecovered * 12),
    netMarginProtectedINR: Math.round(netRevenueSaved),

    channelMetrics,
    rootCauseMetrics,
    checkoutMetrics,
    receivablesMetrics,
    voiceMetrics,

    batchTimestamp: new Date().toISOString(),
    settledCasesCount: recoveredCount
  };
}
