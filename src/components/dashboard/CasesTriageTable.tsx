import React from 'react';
import { Layers, Eye, Play, ArrowRight } from 'lucide-react';
import { RecoveryCase } from '../../types';

interface CasesTriageTableProps {
  cases: RecoveryCase[];
  onSelectCase: (caseItem: RecoveryCase) => void;
  onNavigateTab: (tab: string) => void;
  onRunAgent: (caseId: string) => void;
  isRunningAgent: boolean;
}

export const CasesTriageTable: React.FC<CasesTriageTableProps> = ({
  cases,
  onSelectCase,
  onNavigateTab,
  onRunAgent,
  isRunningAgent
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Active Recovery Operations Ledger</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Live queue of transaction failures currently under autonomous resolution and ACP negotiation
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('cases')}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200/80 transition-colors"
        >
          <span>View All ({cases.length})</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold text-[10px] tracking-wider font-mono">
            <tr>
              <th className="py-3 px-4">Case ID & Event</th>
              <th className="py-3 px-4">Customer Profile</th>
              <th className="py-3 px-4">Channel Rail</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">AI Diagnosis & Root Cause</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.slice(0, 6).map((c) => (
              <tr 
                key={c.caseId}
                onClick={() => onSelectCase(c)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                {/* Case ID */}
                <td className="py-3 px-4">
                  <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{c.caseId}</span>
                    {c.riskTier === 'CRITICAL' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="High Urgency"></span>
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
                    <span className="font-bold text-slate-700 bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                      {c.customer.clvTier}
                    </span>
                  </div>
                </td>

                {/* Channel Rail */}
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {c.sourceEvent.method}
                  </span>
                </td>

                {/* Amount */}
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900 text-xs font-mono">
                    ₹{c.amount.toLocaleString('en-IN')}
                  </div>
                  {c.outcome?.isRecovered && (
                    <div className="text-[10px] font-bold text-emerald-700">
                      ₹{c.outcome.recoveredAmount.toLocaleString('en-IN')} captured
                    </div>
                  )}
                </td>

                {/* AI Root Cause Diagnosis */}
                <td className="py-3 px-4 max-w-xs">
                  <p className="text-xs text-slate-800 font-semibold line-clamp-1">
                    {c.diagnosis?.rootCauseCategory.replace('_', ' ') || 'Ingesting event...'}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {c.diagnosis?.rootCauseDetail || 'Multi-agent analysis scheduled'}
                  </p>
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    c.status === 'RECOVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    c.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    c.status === 'NEGOTIATING' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {c.status}
                  </span>
                </td>

                {/* Action Buttons */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCase(c);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>

                    {c.status !== 'RECOVERED' && c.status !== 'PENDING_APPROVAL' && (
                      <button
                        disabled={isRunningAgent}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRunAgent(c.caseId);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        <span>Run</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
