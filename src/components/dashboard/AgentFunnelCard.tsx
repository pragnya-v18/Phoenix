import React from 'react';
import { 
  AlertTriangle, 
  BrainCircuit, 
  Target, 
  ShieldCheck, 
  Rocket, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { RecoveryCase, ExecutiveKPIs } from '../../types';
import { formatINR } from '../../utils/formatters';

interface RecoveryPipelineProps {
  kpis: ExecutiveKPIs | null;
  cases: RecoveryCase[];
}

export const RecoveryPipeline: React.FC<RecoveryPipelineProps> = ({ kpis, cases }) => {
  const total = cases.length;
  const diagnosed = cases.filter(c => c.diagnosis).length;
  const strategized = cases.filter(c => c.strategy).length;
  const pendingApproval = cases.filter(c => c.status === 'PENDING_APPROVAL').length;
  const recovered = cases.filter(c => c.status === 'RECOVERED').length;
  const revenue = kpis?.totalRevenueRecoveredINR || 0;

  const stages = [
    { label: 'Failure', count: total, icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-200', filled: total > 0 },
    { label: 'Diagnosis', count: diagnosed, icon: BrainCircuit, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', filled: diagnosed > 0 },
    { label: 'Strategy', count: strategized, icon: Target, color: 'text-violet-600 bg-violet-50 border-violet-200', filled: strategized > 0 },
    { label: 'Approval', count: pendingApproval, icon: ShieldCheck, color: 'text-amber-600 bg-amber-50 border-amber-200', filled: pendingApproval > 0 },
    { label: 'Execution', count: recovered, icon: Rocket, color: 'text-sky-600 bg-sky-50 border-sky-200', filled: recovered > 0 },
    { label: 'Revenue', count: revenue, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', filled: revenue > 0, isRevenue: true }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Recovery Lifecycle Pipeline</h3>
        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          {Number(kpis?.recoveryRatePercentage || 0).toFixed(1)}% end-to-end
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <React.Fragment key={stage.label}>
              <div className="flex flex-col items-center min-w-[80px] flex-1">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${stage.color} transition-all ${stage.filled ? 'shadow-xs' : 'opacity-40'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="mt-1.5 text-center">
                  <div className="text-[10px] font-medium text-slate-500">{stage.label}</div>
                  <div className="text-sm font-bold font-mono text-slate-900">
                    {stage.isRevenue ? formatINR(stage.count) : stage.count}
                  </div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 -mt-4" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
