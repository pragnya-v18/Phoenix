import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { ExecutiveKPIs } from '../../types';

interface CheckoutAbandonmentPanelProps {
  metrics: ExecutiveKPIs['checkoutMetrics'];
}

export const CheckoutAbandonmentPanel: React.FC<CheckoutAbandonmentPanelProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>Checkout Abandonment Recovery</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomous recovery of abandoned shopping carts using probability-based incentives and cart-aware messaging
          </p>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          New Pipeline
        </span>
      </div>

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Abandoned</div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{metrics.totalAbandonedCheckouts}</div>
          <div className="text-[11px] text-slate-500">total carts</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
          <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Recovered</div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{metrics.totalRecoveredCheckouts}</div>
          <div className="text-[11px] text-emerald-600">carts saved</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Recovery Rate</div>
          <div className="text-lg font-bold text-indigo-600 font-mono mt-0.5">{metrics.checkoutRecoveryRatePct.toFixed(1)}%</div>
          <div className="text-[11px] text-slate-500">conversion</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
          <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">GMV Recovered</div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">₹{metrics.recoveredGMV_INR.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-emerald-600">of ₹{metrics.totalAtRiskGMV_INR.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Stage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Stage Breakdown</h4>
          <div className="space-y-2">
            {metrics.stageBreakdown.map((stage, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">{stage.stageLabel}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-500">{stage.abandonedCount} abandoned</span>
                    <span className="text-emerald-700 font-bold">{stage.recoveredCount} recovered</span>
                  </div>
                </div>
                <div className="h-1 bg-slate-200/80 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stage.recoveryRatePct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Device Breakdown</h4>
          <div className="space-y-2">
            {metrics.deviceBreakdown.map((device, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 capitalize">{device.device}</span>
                  <span className="text-[11px] text-slate-500 ml-2">{device.abandonedCount} abandoned</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-emerald-700 font-bold">{device.recoveredCount} recovered</span>
                  <span className="text-slate-400">({device.recoveryRatePct.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
