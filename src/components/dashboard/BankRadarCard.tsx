import React from 'react';
import { Radio, ArrowRight, Activity, AlertTriangle, CheckCircle2, Zap, Clock } from 'lucide-react';
import { BankHealthMetric } from '../../types';

interface BankRadarCardProps {
  bankHealth: BankHealthMetric[];
  onNavigateTab: (tab: string) => void;
}

const getHeatColor = (rate: number): string => {
  if (rate >= 95) return 'bg-emerald-500';
  if (rate >= 85) return 'bg-emerald-400';
  if (rate >= 75) return 'bg-amber-400';
  if (rate >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
};

const getHeatBg = (rate: number): string => {
  if (rate >= 95) return 'bg-emerald-50 border-emerald-200';
  if (rate >= 85) return 'bg-emerald-50/50 border-emerald-200/60';
  if (rate >= 75) return 'bg-amber-50/50 border-amber-200/60';
  if (rate >= 60) return 'bg-amber-50 border-amber-200';
  return 'bg-rose-50 border-rose-200';
};

const getLatencyColor = (ms: number): string => {
  if (ms <= 100) return 'text-emerald-700';
  if (ms <= 250) return 'text-amber-700';
  return 'text-rose-700';
};

const ALTERNATIVE_RAILS: Record<string, string[]> = {
  HDFC: ['ICICI', 'SBI', 'AXIS'],
  SBI: ['HDFC', 'ICICI', 'KOTAK'],
  ICICI: ['HDFC', 'SBI', 'AXIS'],
  AXIS: ['HDFC', 'ICICI', 'KOTAK'],
  KOTAK: ['HDFC', 'ICICI', 'SBI']
};

export const BankRadarCard: React.FC<BankRadarCardProps> = ({ bankHealth, onNavigateTab }) => {
  const healthyCount = bankHealth.filter(b => b.status === 'HEALTHY').length;
  const totalCount = bankHealth.length;
  const avgLatency = bankHealth.length > 0 
    ? Math.round(bankHealth.reduce((sum, b) => sum + b.latencyMs, 0) / bankHealth.length) 
    : 0;
  const avgSuccess = bankHealth.length > 0
    ? (bankHealth.reduce((sum, b) => sum + b.rollingSuccessRatePct, 0) / bankHealth.length).toFixed(1)
    : '0.0';

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-indigo-600" />
          Bank Switch Telemetry
        </h3>
        <button onClick={() => onNavigateTab('bank-radar')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          Live Controls <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">NPCI hub + Indian issuer switch health</p>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-200/60 text-center">
          <div className="text-[10px] text-slate-400 font-medium">Healthy</div>
          <div className="text-sm font-bold font-mono text-slate-900">{healthyCount}/{totalCount}</div>
        </div>
        <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-200/60 text-center">
          <div className="text-[10px] text-slate-400 font-medium">Avg Latency</div>
          <div className={`text-sm font-bold font-mono ${getLatencyColor(avgLatency)}`}>{avgLatency}ms</div>
        </div>
        <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-200/60 text-center">
          <div className="text-[10px] text-slate-400 font-medium">Avg Success</div>
          <div className="text-sm font-bold font-mono text-slate-900">{avgSuccess}%</div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-1.5 flex-1">
        {bankHealth.map(b => {
          const alternatives = ALTERNATIVE_RAILS[b.bankCode] || [];
          return (
            <div key={b.bankCode} className={`p-2.5 rounded-lg border transition-all ${getHeatBg(b.rollingSuccessRatePct)}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getHeatColor(b.rollingSuccessRatePct)} ${b.status !== 'HEALTHY' ? 'animate-pulse' : ''}`} />
                  <span className="font-bold text-[11px] text-slate-900">{b.bankCode}</span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{b.name.split(' ')[0]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[11px] font-bold ${getLatencyColor(b.latencyMs)}`}>{b.latencyMs}ms</span>
                  <span className="font-mono text-[11px] font-bold text-slate-900">{b.rollingSuccessRatePct.toFixed(0)}%</span>
                </div>
              </div>
              {/* Success Rate Bar */}
              <div className="h-1 bg-white/80 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${getHeatColor(b.rollingSuccessRatePct)}`} style={{ width: `${b.rollingSuccessRatePct}%` }} />
              </div>
              {/* Alternative Rails */}
              {b.status !== 'HEALTHY' && alternatives.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-[9px]">
                  <span className="text-slate-400 font-medium">Fallback:</span>
                  {alternatives.map(alt => {
                    const altBank = bankHealth.find(x => x.bankCode === alt);
                    const altHealthy = altBank?.status === 'HEALTHY';
                    return (
                      <span key={alt} className={`px-1 py-0.2 rounded font-mono font-semibold ${
                        altHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {alt}{altHealthy ? ' ✓' : ''}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <span>NPCI Hub: <strong className="text-emerald-700">Operational</strong></span>
        <span className="font-mono">15s polling</span>
      </div>
    </div>
  );
};
