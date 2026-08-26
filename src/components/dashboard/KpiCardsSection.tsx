import React from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Coins,
  Bot,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Zap
} from 'lucide-react';
import { ExecutiveKPIs, RecoveryCase } from '../../types';
import { formatINR } from '../../utils/formatters';

interface KpiCardsSectionProps {
  kpis: ExecutiveKPIs | null;
  cases: RecoveryCase[];
}

export const KpiCardsSection: React.FC<KpiCardsSectionProps> = ({ kpis, cases }) => {
  const totalRecovered = kpis?.totalRevenueRecoveredINR || cases.filter(c => c.status === 'RECOVERED').reduce((acc, c) => acc + (c.outcome?.recoveredAmount || c.amount), 0);
  const recoveryRate = kpis?.recoveryRatePercentage || 0;
  const activeCases = kpis?.activeCasesCount || cases.filter(c => c.status !== 'RECOVERED' && c.status !== 'FAILED' && c.status !== 'DISMISSED').length;
  const aiDecisions = cases.filter(c => c.diagnosis || c.strategy).length;
  const humanEscalations = cases.filter(c => c.status === 'PENDING_APPROVAL').length;
  const complianceHalts = cases.filter(c => c.compliance?.requiresHumanApproval).length;
  const agentHealth = cases.length > 0 ? Math.round((cases.filter(c => c.diagnosis).length / cases.length) * 100) : 100;
  const totalCost = (kpis?.totalRecoveryCostINR || 0) + (kpis?.totalIncentiveCostINR || 0);
  const netSaved = kpis?.netRevenueSavedINR || 0;
  const efficiency = totalCost > 0 ? (netSaved / totalCost).toFixed(1) : '0.0';

  const cards = [
    {
      label: 'Revenue Recovered',
      value: formatINR(totalRecovered),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-l-emerald-500',
      footer: `${cases.filter(c => c.status === 'RECOVERED').length} settled`,
      footerColor: 'text-emerald-700'
    },
    {
      label: 'Recovery Rate',
      value: `${Number(recoveryRate).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-l-indigo-500',
      footer: `Avg ${kpis?.avgRecoveryTimeMinutes || 0} min`,
      footerColor: 'text-indigo-700'
    },
    {
      label: 'Active Cases',
      value: activeCases,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-l-amber-500',
      footer: `${cases.length} total audited`,
      footerColor: 'text-amber-700'
    },
    {
      label: 'AI Decisions',
      value: aiDecisions,
      icon: Bot,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-l-violet-500',
      footer: 'Gemini 3.7 Flash',
      footerColor: 'text-violet-700'
    },
    {
      label: 'Human Escalations',
      value: humanEscalations,
      icon: ShieldAlert,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-l-orange-500',
      footer: 'Pending HITL review',
      footerColor: 'text-orange-700'
    },
    {
      label: 'Compliance Halts',
      value: complianceHalts,
      icon: ShieldCheck,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-l-rose-500',
      footer: 'RBI guardrails active',
      footerColor: 'text-rose-700'
    },
    {
      label: 'Agent Health',
      value: `${agentHealth}%`,
      icon: Activity,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-l-sky-500',
      footer: 'Pipeline execution rate',
      footerColor: 'text-sky-700'
    },
    {
      label: 'Recovery Efficiency',
      value: `${efficiency}x`,
      icon: Zap,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-l-teal-500',
      footer: `₹${(netSaved / 1000).toFixed(0)}K net saved`,
      footerColor: 'text-teal-700'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className={`bg-white p-4 rounded-xl border border-slate-200/80 border-l-[3px] ${card.border} shadow-xs hover:shadow-sm transition-all flex flex-col justify-between`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{card.label}</span>
              <div className={`w-7 h-7 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-xl font-bold tracking-tight font-mono ${card.color}`}>
              {card.value}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <span className={`text-[10px] font-medium ${card.footerColor}`}>{card.footer}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
