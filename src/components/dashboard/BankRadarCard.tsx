import React from 'react';
import { Radio, ArrowRight } from 'lucide-react';
import { BankHealthMetric } from '../../types';

interface BankRadarCardProps {
  bankHealth: BankHealthMetric[];
  onNavigateTab: (tab: string) => void;
}

export const BankRadarCard: React.FC<BankRadarCardProps> = ({ bankHealth, onNavigateTab }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-600" />
            <span>Indian Issuer Bank Switch Radar</span>
          </h3>
          <button
            onClick={() => onNavigateTab('bank-radar')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Live Controls</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Real-time health index of core Indian bank switches preventing blind retry loops
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {bankHealth.map(b => (
            <div 
              key={b.bankCode} 
              className={`p-3 rounded-xl border text-xs transition-all ${
                b.status === 'HEALTHY' 
                  ? 'bg-slate-50/70 border-slate-200/80' 
                  : 'bg-amber-50/70 border-amber-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">{b.bankCode}</span>
                <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-800">
                  <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`}></span>
                  {b.rollingSuccessRatePct.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate">{b.name.split(' ')[0]}</span>
                <span className="font-mono">{b.latencyMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>NPCI Switch: <strong className="text-slate-800">Operational (99.4%)</strong></span>
        <span className="text-indigo-600 font-bold font-mono text-[11px]">Polling 15s</span>
      </div>
    </div>
  );
};
