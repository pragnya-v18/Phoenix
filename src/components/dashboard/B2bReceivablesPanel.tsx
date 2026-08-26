import React from 'react';
import { FileText } from 'lucide-react';
import { ExecutiveKPIs } from '../../types';

interface B2bReceivablesPanelProps {
  metrics: ExecutiveKPIs['receivablesMetrics'];
}

export const B2bReceivablesPanel: React.FC<B2bReceivablesPanelProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600" />
            <span>B2B Receivables Recovery</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomous overdue invoice recovery with DPD aging analysis and promise-to-pay tracking
          </p>
        </div>
        <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
          New Pipeline
        </span>
      </div>

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Overdue</div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{metrics.totalOverdueInvoices}</div>
          <div className="text-[11px] text-slate-500">total invoices</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
          <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Recovered</div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{metrics.totalRecoveredInvoices}</div>
          <div className="text-[11px] text-emerald-600">invoices settled</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Recovery Rate</div>
          <div className="text-lg font-bold text-indigo-600 font-mono mt-0.5">{metrics.receivablesRecoveryRatePct}%</div>
          <div className="text-[11px] text-slate-500">collection rate</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
          <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Collected</div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">₹{metrics.totalRecoveredINR.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-emerald-600">of ₹{metrics.totalOutstandingINR.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Aging Buckets + Root Causes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Aging Buckets (DPD)</h4>
          <div className="space-y-2">
            {metrics.agingBreakdown.map((bucket, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">{bucket.bucketLabel}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-500">{bucket.invoiceCount} invoices</span>
                    <span className="text-emerald-700 font-bold">{bucket.recoveredCount} settled</span>
                  </div>
                </div>
                <div className="h-1 bg-slate-200/80 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${bucket.recoveryRatePct}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>Outstanding: ₹{bucket.outstandingINR.toLocaleString('en-IN')}</span>
                  <span className="text-emerald-700 font-bold">Collected: ₹{bucket.recoveredINR.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Root Causes</h4>
          <div className="space-y-2">
            {metrics.rootCauseBreakdown.map((cause, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800">{cause.causeLabel}</span>
                  <span className="text-[11px] text-slate-500 ml-2">{cause.invoiceCount} invoices</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-emerald-700 font-bold">{cause.recoveredCount} recovered</span>
                  <span className="text-slate-400">({cause.recoveryRatePct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
