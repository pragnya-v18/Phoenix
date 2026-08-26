import React from 'react';
import { Coins, Sparkles } from 'lucide-react';

interface UnitEconomicsPanelProps {
  totalRecovered: number;
  recoveryRate: number;
  incentiveCost: number;
  recoveryCost: number;
  netRevenueSaved: number;
  recoveryROI: number;
}

export const UnitEconomicsPanel: React.FC<UnitEconomicsPanelProps> = ({
  totalRecovered,
  recoveryRate,
  incentiveCost,
  recoveryCost,
  netRevenueSaved,
  recoveryROI
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-violet-600" />
            <span>Unit Economics & Cost Accounting</span>
          </h3>
          <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
            Live Audited
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Strict accounting of incentives and agent execution cost vs recovered margin
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500">Gross Recovered</div>
              <div className="text-sm font-bold text-emerald-700">₹{totalRecovered.toLocaleString('en-IN')}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Recovery Rate</div>
              <div className="text-sm font-bold text-slate-900">{Number(recoveryRate).toFixed(1)}%</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-slate-600 text-[11px]">
              <span>Total Incentive Cost (Discounts/Cashback):</span>
              <span className="font-bold text-rose-600">-₹{incentiveCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 text-[11px]">
              <span>Recovery Operational Cost (WhatsApp/AI API):</span>
              <span className="font-bold text-rose-600">-₹{recoveryCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900 font-bold">
              <span>Net Revenue Saved (Margin):</span>
              <span className="text-emerald-700 text-sm">₹{netRevenueSaved.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-[11px] font-bold text-indigo-950">Net Recovery Multiplier</span>
            </div>
            <span className="font-bold text-indigo-700 text-sm">{recoveryROI}x ROI</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-slate-400 text-[11px] flex justify-between">
        <span>Formula: Net = Recovered - (Incentives + Ops)</span>
      </div>
    </div>
  );
};
