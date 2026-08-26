import React from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Coins
} from 'lucide-react';
import { ExecutiveKPIs, RecoveryCase } from '../../types';

interface KpiCardsSectionProps {
  kpis: ExecutiveKPIs | null;
  cases: RecoveryCase[];
}

export const KpiCardsSection: React.FC<KpiCardsSectionProps> = ({ kpis, cases }) => {
  const totalAtRisk = kpis?.totalRevenueAtRiskINR || cases.reduce((acc, c) => acc + c.amount, 0);
  const totalRecovered = kpis?.totalRevenueRecoveredINR || cases.filter(c => c.status === 'RECOVERED').reduce((acc, c) => acc + (c.outcome?.recoveredAmount || c.amount), 0);
  const recoveryRate = kpis?.recoveryRatePercentage || (totalAtRisk > 0 ? (totalRecovered / totalAtRisk) * 100 : 0);
  const avgTimeMinutes = kpis?.avgRecoveryTimeMinutes || 2.4;
  const netRevenueSaved = kpis?.netRevenueSavedINR || Math.round(totalRecovered * 0.94);
  const recoveryROI = kpis?.recoveryROI || 18.4;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Revenue at Risk */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold text-slate-500">Revenue At Risk</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            ₹{totalAtRisk.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-[11px]">Total Audited:</span>
            <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 text-[11px]">
              {cases.length} payment failures
            </span>
          </div>
        </div>
      </div>

      {/* Metric 2: Revenue Recovered */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold text-slate-500">Revenue Recovered</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">
            ₹{totalRecovered.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-[11px]">Settled via Razorpay</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px]">
              {cases.filter(c => c.status === 'RECOVERED').length} Settled
            </span>
          </div>
        </div>
      </div>

      {/* Metric 3: Recovery Rate % & Velocity */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold text-slate-500">Recovery Rate %</span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-indigo-600 tracking-tight font-mono">
            {Number(recoveryRate).toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-[11px]">Avg. Velocity:</span>
            <span className="font-bold text-slate-900 font-mono text-[11px]">
              {avgTimeMinutes} mins
            </span>
          </div>
        </div>
      </div>

      {/* Metric 4: Net Revenue Saved */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold text-slate-500">Net Revenue Saved</span>
          <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            ₹{netRevenueSaved.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-[11px]">Recovery ROI:</span>
            <span className="font-bold text-violet-700 bg-violet-50 px-1.5 py-0.2 rounded text-[11px]">
              {recoveryROI}x Return
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
