import React from 'react';
import { PieChart } from 'lucide-react';
import { RootCauseRecoveryMetric } from '../../types';

interface RootCauseForensicsCardProps {
  rootCauses: RootCauseRecoveryMetric[];
}

export const RootCauseForensicsCard: React.FC<RootCauseForensicsCardProps> = ({ rootCauses }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-violet-600" />
          <span>AI Root Cause Forensics & Resolution Rate</span>
        </h3>
        <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
          Gemini 3.7 Flash
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Recovery efficiency across primary failure vectors identified by diagnosis agents
      </p>

      <div className="space-y-3">
        {rootCauses.map((rc, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-900">{rc.rootCauseLabel}</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-[11px] text-slate-500">{rc.recoveredCases}/{rc.totalCases} cases</span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                  {rc.recoveryRatePct}%
                </span>
              </div>
            </div>

            <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${rc.recoveryRatePct}%` }}></div>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>At Risk: ₹{rc.revenueAtRiskINR.toLocaleString('en-IN')}</span>
              <span className="text-emerald-700 font-bold">Saved: ₹{rc.revenueRecoveredINR.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
