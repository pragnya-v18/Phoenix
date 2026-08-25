import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Eye, 
  Play, 
  ShieldCheck, 
  Zap,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { RecoveryCase, CaseStatus, RiskTier } from '../types';

interface RecoveryCasesViewProps {
  cases: RecoveryCase[];
  onSelectCase: (c: RecoveryCase) => void;
  onRunAgent: (caseId: string) => void;
  isRunningAgent: boolean;
}

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
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Recovery Cases & Triage Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit intercepted failure cases, inspect multi-agent reasoning, and manage Human-in-the-Loop clearances
          </p>
        </div>

        {/* Quick Filter Status Badges */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({cases.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'PENDING_APPROVAL'
                ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                : 'text-amber-700 hover:text-amber-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Needs Review ({pendingApprovalCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('RECOVERED')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'RECOVERED'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Recovered ({recoveredCount})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Case ID, Customer, Phone, or Payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-medium">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Tiers</option>
              <option value="CRITICAL">Critical (High Value)</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-[11px] font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="DETECTED">Detected</option>
              <option value="DIAGNOSING">Diagnosing</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="EXECUTING">Executing</option>
              <option value="RECOVERED">Recovered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main SaaS Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Case ID & Event</th>
                <th className="py-2.5 px-4">Customer Profile</th>
                <th className="py-2.5 px-4">Channel Rail</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">AI Diagnosis & Root Cause</th>
                <th className="py-2.5 px-4">Proposed Strategy</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No recovery cases matched the search filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr 
                    key={c.caseId}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Case ID */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{c.caseId}</span>
                        {c.riskTier === 'CRITICAL' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Critical Urgency"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {c.eventType.replace('_', ' ')}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.customer.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span>{c.customer.phone}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                          {c.customer.clvTier}
                        </span>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.sourceEvent.method}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">
                        ₹{c.amount.toLocaleString('en-IN')}
                      </div>
                      {c.outcome?.isRecovered && (
                        <div className="text-[10px] font-semibold text-emerald-700">
                          Captured ₹{c.outcome.recoveredAmount.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* AI Diagnosis */}
                    <td className="py-3 px-4 max-w-xs">
                      {c.diagnosis ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 text-[11px]">
                              {c.diagnosis.rootCauseCategory.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-indigo-700 font-mono bg-indigo-50 px-1 py-0.2 rounded">
                              {(c.diagnosis.confidenceScore * 100).toFixed(0)}% conf
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {c.diagnosis.rootCauseDetail}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Diagnosing...</span>
                      )}
                    </td>

                    {/* Strategy */}
                    <td className="py-3 px-4 max-w-xs">
                      {c.strategy ? (
                        <div>
                          <div className="font-medium text-slate-800 text-[11px] flex items-center gap-1">
                            <span className="font-semibold text-indigo-700">{c.strategy.targetChannel}</span>
                            {c.strategy.offeredDiscountPct > 0 && (
                              <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 text-[10px] font-semibold">
                                {c.strategy.offeredDiscountPct}% off
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {c.strategy.reasoning}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Formulating...</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        c.status === 'RECOVERED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-300 animate-pulse'
                          : c.status === 'NEGOTIATING'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : c.status === 'EXECUTING'
                          ? 'bg-violet-50 text-violet-700 border border-violet-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status === 'RECOVERED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {c.status === 'PENDING_APPROVAL' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                        <span>{c.status.replace('_', ' ')}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectCase(c)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>

                        {c.status !== 'RECOVERED' && (
                          <button
                            disabled={isRunningAgent}
                            onClick={() => onRunAgent(c.caseId)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <Play className="w-3 h-3" />
                            <span>Run</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
