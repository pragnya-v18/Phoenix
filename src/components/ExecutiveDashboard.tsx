import React from 'react';
import { ExecutiveKPIs, RecoveryCase, BankHealthMetric, ChannelRecoveryMetric, RootCauseRecoveryMetric } from '../types';
import {
  KpiCardsSection,
  CheckoutAbandonmentPanel,
  B2bReceivablesPanel,
  VoiceRecoveryPanel,
  RecoveryVelocityChart,
  UnitEconomicsPanel,
  ChannelBreakdownCard,
  RootCauseForensicsCard,
  CasesTriageTable,
  RecoveryPipeline,
  BankRadarCard
} from './dashboard';

interface ExecutiveDashboardProps {
  kpis: ExecutiveKPIs | null;
  cases: RecoveryCase[];
  bankHealth: BankHealthMetric[];
  onSelectCase: (caseItem: RecoveryCase) => void;
  onNavigateTab: (tab: string) => void;
  onRunAgent: (caseId: string) => void;
  isRunningAgent: boolean;
  timeRange: string;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  kpis,
  cases,
  bankHealth,
  onSelectCase,
  onNavigateTab,
  onRunAgent,
  isRunningAgent,
  timeRange
}) => {
  const totalAtRisk = kpis?.totalRevenueAtRiskINR || cases.reduce((acc, c) => acc + c.amount, 0);
  const totalRecovered = kpis?.totalRevenueRecoveredINR || cases.filter(c => c.status === 'RECOVERED').reduce((acc, c) => acc + (c.outcome?.recoveredAmount || c.amount), 0);
  const recoveryRate = kpis?.recoveryRatePercentage || (totalAtRisk > 0 ? (totalRecovered / totalAtRisk) * 100 : 0);
  const netRevenueSaved = kpis?.netRevenueSavedINR || Math.round(totalRecovered * 0.94);
  const incentiveCost = kpis?.totalIncentiveCostINR || Math.round(totalRecovered * 0.04);
  const recoveryCost = kpis?.totalRecoveryCostINR || Math.round(cases.length * 2.85);
  const recoveryROI = kpis?.recoveryROI || 18.4;

  const channelData: ChannelRecoveryMetric[] = kpis?.channelMetrics && kpis.channelMetrics.length > 0 
    ? kpis.channelMetrics 
    : [
        {
          channel: 'WHATSAPP', channelName: 'WhatsApp Business (ACP Interactive)',
          attemptedCases: Math.max(1, Math.round(cases.length * 0.55)), recoveredCases: Math.max(1, Math.round(cases.filter(c => c.status === 'RECOVERED').length * 0.6)),
          revenueAtRiskINR: Math.round(totalAtRisk * 0.55), revenueRecoveredINR: Math.round(totalRecovered * 0.62),
          channelRecoveryRatePct: 82.4, avgRecoveryTimeSec: 98, totalIncentiveINR: Math.round(incentiveCost * 0.6),
          totalRecoveryCostINR: Math.round(recoveryCost * 0.55), totalMdrFeeINR: Math.round(totalRecovered * 0.62 * 0.015),
          netRevenueSavedINR: Math.round(totalRecovered * 0.58), roiMultiplier: 21.5
        },
        {
          channel: 'ACP_A2A', channelName: 'ACP 2.0 Autonomous Agent-to-Agent',
          attemptedCases: Math.max(1, Math.round(cases.length * 0.25)), recoveredCases: Math.max(1, Math.round(cases.filter(c => c.status === 'RECOVERED').length * 0.28)),
          revenueAtRiskINR: Math.round(totalAtRisk * 0.25), revenueRecoveredINR: Math.round(totalRecovered * 0.26),
          channelRecoveryRatePct: 88.0, avgRecoveryTimeSec: 42, totalIncentiveINR: Math.round(incentiveCost * 0.3),
          totalRecoveryCostINR: Math.round(recoveryCost * 0.25), totalMdrFeeINR: Math.round(totalRecovered * 0.26 * 0.018),
          netRevenueSavedINR: Math.round(totalRecovered * 0.25), roiMultiplier: 28.2
        },
        {
          channel: 'SMS', channelName: 'SMS Smart Link Routing',
          attemptedCases: Math.max(1, Math.round(cases.length * 0.20)), recoveredCases: Math.max(0, Math.round(cases.filter(c => c.status === 'RECOVERED').length * 0.12)),
          revenueAtRiskINR: Math.round(totalAtRisk * 0.20), revenueRecoveredINR: Math.round(totalRecovered * 0.12),
          channelRecoveryRatePct: 54.2, avgRecoveryTimeSec: 210, totalIncentiveINR: Math.round(incentiveCost * 0.1),
          totalRecoveryCostINR: Math.round(recoveryCost * 0.20), totalMdrFeeINR: Math.round(totalRecovered * 0.12 * 0.019),
          netRevenueSavedINR: Math.round(totalRecovered * 0.11), roiMultiplier: 9.4
        }
      ];

  const rootCauses: RootCauseRecoveryMetric[] = kpis?.rootCauseMetrics && kpis.rootCauseMetrics.length > 0
    ? kpis.rootCauseMetrics
    : [
        { rootCause: 'LIMIT_EXCEEDED', rootCauseLabel: 'UPI / Daily Ticket Limit Exceeded', totalCases: Math.max(1, Math.round(cases.length * 0.42)), recoveredCases: Math.max(1, Math.round(cases.filter(c => c.status === 'RECOVERED').length * 0.48)), revenueAtRiskINR: Math.round(totalAtRisk * 0.42), revenueRecoveredINR: Math.round(totalRecovered * 0.48), recoveryRatePct: 84.2 },
        { rootCause: 'ISSUER_DOWNTIME', rootCauseLabel: 'Issuer Bank Network Outage', totalCases: Math.max(1, Math.round(cases.length * 0.28)), recoveredCases: Math.max(1, Math.round(cases.filter(c => c.status === 'RECOVERED').length * 0.24)), revenueAtRiskINR: Math.round(totalAtRisk * 0.28), revenueRecoveredINR: Math.round(totalRecovered * 0.24), recoveryRatePct: 71.5 },
        { rootCause: 'MANDATE_EXPIRED', rootCauseLabel: 'Recurring e-Mandate Expired', totalCases: Math.max(1, Math.round(cases.length * 0.18)), recoveredCases: Math.max(1, Math.round(cases.filter(c => c.status === 'RECOVERED').length * 0.18)), revenueAtRiskINR: Math.round(totalAtRisk * 0.18), revenueRecoveredINR: Math.round(totalRecovered * 0.18), recoveryRatePct: 79.0 },
        { rootCause: 'CUSTOMER_FRICTION', rootCauseLabel: 'Customer Checkout Dropoff', totalCases: Math.max(1, Math.round(cases.length * 0.12)), recoveredCases: Math.max(0, Math.round(cases.filter(c => c.status === 'RECOVERED').length * 0.10)), revenueAtRiskINR: Math.round(totalAtRisk * 0.12), revenueRecoveredINR: Math.round(totalRecovered * 0.10), recoveryRatePct: 61.2 }
      ];

  return (
    <div className="space-y-5">
      {/* 1. KPI Cards — 8 metrics */}
      <KpiCardsSection kpis={kpis} cases={cases} />

      {/* 2. Recovery Lifecycle Pipeline — horizontal */}
      <RecoveryPipeline kpis={kpis} cases={cases} />

      {/* 3. Velocity Chart + Unit Economics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <RecoveryVelocityChart totalRecovered={totalRecovered} />
        <UnitEconomicsPanel
          totalRecovered={totalRecovered}
          recoveryRate={recoveryRate}
          incentiveCost={incentiveCost}
          recoveryCost={recoveryCost}
          netRevenueSaved={netRevenueSaved}
          recoveryROI={recoveryROI}
        />
      </div>

      {/* 4. Channel + Root Cause + Bank Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChannelBreakdownCard channelData={channelData} />
        <RootCauseForensicsCard rootCauses={rootCauses} />
        <BankRadarCard bankHealth={bankHealth} onNavigateTab={onNavigateTab} />
      </div>

      {/* 5. Pipeline Workflows */}
      <CheckoutAbandonmentPanel metrics={kpis?.checkoutMetrics} />
      <B2bReceivablesPanel metrics={kpis?.receivablesMetrics} />
      <VoiceRecoveryPanel metrics={kpis?.voiceMetrics} />

      {/* 6. Cases Triage Table */}
      <CasesTriageTable
        cases={cases}
        onSelectCase={onSelectCase}
        onNavigateTab={onNavigateTab}
        onRunAgent={onRunAgent}
        isRunningAgent={isRunningAgent}
      />
    </div>
  );
};
