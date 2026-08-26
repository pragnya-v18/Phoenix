import React from 'react';
import { Phone } from 'lucide-react';
import { ExecutiveKPIs } from '../../types';

interface VoiceRecoveryPanelProps {
  metrics: ExecutiveKPIs['voiceMetrics'];
}

export const VoiceRecoveryPanel: React.FC<VoiceRecoveryPanelProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-violet-600" />
            <span>Voice Recovery Agent</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hinglish/English/Hindi voice calls with multi-tone script generation and promise-to-pay tracking
          </p>
        </div>
        <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
          New Pipeline
        </span>
      </div>

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Calls</div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{metrics.totalCallsPlaced}</div>
          <div className="text-[11px] text-slate-500">placed</div>
        </div>
        <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-200/80">
          <div className="text-[10px] text-violet-600 uppercase tracking-wider font-semibold">Success Rate</div>
          <div className="text-lg font-bold text-violet-700 font-mono mt-0.5">{metrics.callSuccessRatePct}%</div>
          <div className="text-[11px] text-violet-600">calls answered</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
          <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">PTP Rate</div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{metrics.promiseToPayConversionRatePct}%</div>
          <div className="text-[11px] text-emerald-600">conversion</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
          <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Revenue Recovered</div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">₹{metrics.revenueRecoveredViaVoiceINR.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-emerald-600">via voice calls</div>
        </div>
      </div>

      {/* Outcome Breakdown + Language Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Call Outcomes</h4>
          <div className="space-y-2">
            {metrics.outcomeBreakdown.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">{item.label}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-500">{item.count} calls</span>
                    <span className="text-violet-700 font-bold">{item.pct}%</span>
                  </div>
                </div>
                <div className="h-1 bg-slate-200/80 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Language Performance</h4>
          <div className="space-y-2">
            {metrics.languageBreakdown.map((lang, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800">{lang.label}</span>
                  <span className="text-[11px] text-slate-500 ml-2">{lang.callCount} calls</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <div className="text-center">
                    <div className="text-[9px] text-slate-400 uppercase">Success</div>
                    <div className="text-violet-700 font-bold">{lang.successRatePct}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-slate-400 uppercase">PTP</div>
                    <div className="text-emerald-700 font-bold">{lang.ptpRatePct}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-violet-50/50 border border-violet-200/50">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-violet-700 font-semibold">Avg Call Duration</span>
              <span className="font-mono font-bold text-violet-800">{metrics.avgCallDurationSeconds}s</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-violet-700 font-semibold">Cost per Recovery</span>
              <span className="font-mono font-bold text-violet-800">₹{metrics.costPerRecoveryINR}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-violet-700 font-semibold">First Attempt Success</span>
              <span className="font-mono font-bold text-violet-800">{metrics.retryStats.firstAttemptSuccessPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
