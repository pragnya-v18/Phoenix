import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  Play, 
  ShieldCheck,
  ArrowRight,
  Clock,
  Bot,
  Target,
  Zap
} from 'lucide-react';
import { RecoveryCase, CaseStatus, RiskTier } from '../types';
import { formatINR } from '../utils/formatters';
import { getChannelIcon } from '../utils/iconResolvers';

interface RecoveryCasesViewProps {
  cases: RecoveryCase[];
  onSelectCase: (c: RecoveryCase) => void;
  onRunAgent: (caseId: string) => void;
  isRunningAgent: boolean;
}

const PIPELINE_STAGES = [
  { key: 'DETECTED', label: 'Detected', icon: AlertCircle, color: 'text-slate-500' },
  { key: 'DIAGNOSING', label: 'Diagnose', icon: Bot, color: 'text-indigo-500' },
  { key: 'NEGOTIATING', label: 'Strategy', icon: Target, color: 'text-violet-500' },
  { key: 'PENDING_APPROVAL', label: 'Review', icon: ShieldCheck, color: 'text-amber-500' },
  { key: 'EXECUTING', label: 'Execute', icon: Zap, color: 'text-sky-500' },
  { key: 'RECOVERED', label: 'Settled', icon: CheckCircle2, color: 'text-emerald-500' }
];

const getPipelineIndex = (status: string): number => {
  const idx = PIPELINE_STAGES.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
};

export const RecoveryCasesView: React.FC<RecoveryCasesViewProps> = ({
  cases,
  onSelectCase,
  onRunAgent,
  isRunningAgent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const filteredCases = cases.filter((c) => {
    const matchesSearch = 
      c.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer.phone.includes(searchTerm) ||
      (c.sourceEvent.paymentId && c.sourceEvent.paymentId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesRisk = riskFilter === 'ALL' || c.riskTier === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const pendingApprovalCount = cases.filter(c => c.status === 'PENDING_APPROVAL').length;
  const recoveredCount = cases.filter(c => c.status === 'RECOVERED').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">Case Intelligence Ledger</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {cases.length} intercepted failures · {pendingApprovalCount} pending review · {recoveredCount} recovered
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
          {[
            { key: 'ALL', label: 'All', count: cases.length },
            { key: 'PENDING_APPROVAL', label: 'Review', count: pendingApprovalCount },
            { key: 'RECOVERED', label: 'Settled', count: recoveredCount }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 rounded-md transition-all text-[11px] ${
                statusFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cases, customers, payment IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-slate-400" />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 rounded-md px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Risk</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200/80 rounded-md px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Status</option>
            <option value="DETECTED">Detected</option>
            <option value="DIAGNOSING">Diagnosing</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="EXECUTING">Executing</option>
            <option value="RECOVERED">Recovered</option>
          </select>
        </div>
      </div>

      {/* Case Cards */}
      <div className="space-y-2">
        {filteredCases.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
            No cases match the current filters.
          </div>
        ) : (
          filteredCases.map((c) => {
            const pipelineIdx = getPipelineIndex(c.status);
            const ChannelIcon = getChannelIcon(c.sourceEvent.method);
            return (
              <div
                key={c.caseId}
                className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
                onClick={() => onSelectCase(c)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Case info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-xs text-slate-900">{c.caseId}</span>
                        {c.riskTier === 'CRITICAL' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          c.riskTier === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' :
                          c.riskTier === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          c.riskTier === 'MEDIUM' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                          {c.riskTier}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                          c.status === 'RECOVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          c.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                          c.status === 'NEGOTIATING' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          c.status === 'EXECUTING' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
                        <span className="font-medium text-slate-700">{c.customer.name}</span>
                        <span>{c.customer.phone}</span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-1">
                          <ChannelIcon className="w-3 h-3" />
                          {c.sourceEvent.method}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-bold text-slate-900">{formatINR(c.amount)}</span>
                      </div>

                      {/* Diagnosis snippet */}
                      {c.diagnosis && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          <span className="font-semibold text-indigo-700">{c.diagnosis.rootCauseCategory.replace('_', ' ')}</span>
                          {' · '}
                          {c.diagnosis.rootCauseDetail}
                        </div>
                      )}
                    </div>

                    {/* Right: Pipeline + Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Mini pipeline */}
                      <div className="hidden lg:flex items-center gap-0.5">
                        {PIPELINE_STAGES.map((stage, i) => {
                          const Icon = stage.icon;
                          const isActive = i === pipelineIdx;
                          const isDone = i < pipelineIdx;
                          return (
                            <div
                              key={stage.key}
                              className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                                isActive ? `${stage.color} bg-slate-100 ring-1 ring-current/20` : isDone ? 'text-emerald-500' : 'text-slate-200'
                              }`}
                              title={stage.label}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                          );
                        })}
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-slate-900">{formatINR(c.amount)}</div>
                        {c.outcome?.isRecovered && (
                          <div className="text-[10px] font-semibold text-emerald-700">+{formatINR(c.outcome.recoveredAmount)}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectCase(c); }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                          title="Open dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {c.status !== 'RECOVERED' && (
                          <button
                            disabled={isRunningAgent}
                            onClick={(e) => { e.stopPropagation(); onRunAgent(c.caseId); }}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors disabled:opacity-50"
                            title="Run pipeline"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
