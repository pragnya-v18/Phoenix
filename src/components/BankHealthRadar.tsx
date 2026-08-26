import React, { useState } from 'react';
import { 
  Radio, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Server, 
  Zap,
  Clock,
  ArrowRight,
  ShieldAlert,
  TrendingDown
} from 'lucide-react';
import { BankHealthMetric } from '../types';

interface BankHealthRadarProps {
  bankHealth: BankHealthMetric[];
  onSimulateBankStatus: (bankCode: string, successRate: number, status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE') => Promise<void>;
}

const getHeatColor = (rate: number): string => {
  if (rate >= 95) return 'bg-emerald-500';
  if (rate >= 85) return 'bg-emerald-400';
  if (rate >= 75) return 'bg-amber-400';
  if (rate >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
};

const getHeatText = (rate: number): string => {
  if (rate >= 95) return 'text-emerald-700';
  if (rate >= 85) return 'text-emerald-600';
  if (rate >= 75) return 'text-amber-700';
  if (rate >= 60) return 'text-amber-600';
  return 'text-rose-700';
};

const ALTERNATIVE_RAILS: Record<string, string[]> = {
  HDFC: ['ICICI', 'SBI', 'AXIS'],
  SBI: ['HDFC', 'ICICI', 'KOTAK'],
  ICICI: ['HDFC', 'SBI', 'AXIS'],
  AXIS: ['HDFC', 'ICICI', 'KOTAK'],
  KOTAK: ['HDFC', 'ICICI', 'SBI']
};

export const BankHealthRadar: React.FC<BankHealthRadarProps> = ({
  bankHealth,
  onSimulateBankStatus
}) => {
  const [selectedBank, setSelectedBank] = useState<string>('SBI');
  const [testSuccessRate, setTestSuccessRate] = useState<number>(65);

  const handleSimulate = async (status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE') => {
    await onSimulateBankStatus(selectedBank, testSuccessRate, status);
  };

  const healthyCount = bankHealth.filter(b => b.status === 'HEALTHY').length;
  const degradedCount = bankHealth.filter(b => b.status === 'DEGRADED').length;
  const outageCount = bankHealth.filter(b => b.status === 'OUTAGE').length;
  const avgLatency = bankHealth.length > 0 ? Math.round(bankHealth.reduce((s, b) => s + b.latencyMs, 0) / bankHealth.length) : 0;
  const totalSamples = bankHealth.reduce((s, b) => s + b.sampleCountLast15Min, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-600" />
            Bank Switch Telemetry Dashboard
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time health of NPCI UPI hub and Indian issuer switches
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs text-center">
          <div className="text-[10px] text-slate-400 font-medium">Healthy</div>
          <div className="text-lg font-bold font-mono text-emerald-700">{healthyCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs text-center">
          <div className="text-[10px] text-slate-400 font-medium">Degraded</div>
          <div className="text-lg font-bold font-mono text-amber-700">{degradedCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs text-center">
          <div className="text-[10px] text-slate-400 font-medium">Outage</div>
          <div className="text-lg font-bold font-mono text-rose-700">{outageCount}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs text-center">
          <div className="text-[10px] text-slate-400 font-medium">Avg Latency</div>
          <div className="text-lg font-bold font-mono text-slate-900">{avgLatency}ms</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs text-center">
          <div className="text-[10px] text-slate-400 font-medium">Samples (15m)</div>
          <div className="text-lg font-bold font-mono text-slate-900">{totalSamples.toLocaleString()}</div>
        </div>
      </div>

      {/* Bank Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankHealth.map((bank) => {
          const alternatives = ALTERNATIVE_RAILS[bank.bankCode] || [];
          return (
            <div key={bank.bankCode} className={`p-4 rounded-xl border transition-all ${
              bank.status === 'HEALTHY' ? 'bg-white border-slate-200/80 shadow-xs' : 'bg-amber-50/40 border-amber-300 shadow-xs'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{bank.bankCode}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      bank.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      bank.status === 'DEGRADED' ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse' :
                      'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                    }`}>
                      {bank.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">{bank.name}</div>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  bank.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-600' : 
                  bank.status === 'DEGRADED' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {bank.status === 'HEALTHY' ? <CheckCircle2 className="w-4 h-4" /> : 
                   bank.status === 'DEGRADED' ? <AlertTriangle className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2 pt-2.5 border-t border-slate-100">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">15m Rolling Success:</span>
                  <span className={`font-bold font-mono ${getHeatText(bank.rollingSuccessRatePct)}`}>{bank.rollingSuccessRatePct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${getHeatColor(bank.rollingSuccessRatePct)}`} style={{ width: `${bank.rollingSuccessRatePct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Latency: <strong className="text-slate-700">{bank.latencyMs}ms</strong></span>
                  <span>Samples: <strong className="text-slate-700">{bank.sampleCountLast15Min.toLocaleString()}</strong></span>
                </div>
                {bank.consecutiveOutageMinutes && bank.consecutiveOutageMinutes > 0 && (
                  <div className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Outage: {bank.consecutiveOutageMinutes}min · {bank.autoPausedWorkflowsCount || 0} workflows paused
                  </div>
                )}
                {/* Alternative Rails */}
                {bank.status !== 'HEALTHY' && alternatives.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-100">
                    <div className="text-[9px] text-slate-400 font-medium mb-1">Recommended Fallback:</div>
                    <div className="flex items-center gap-1">
                      {alternatives.map(alt => {
                        const altBank = bankHealth.find(x => x.bankCode === alt);
                        const altHealthy = altBank?.status === 'HEALTHY';
                        return (
                          <span key={alt} className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                            altHealthy ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {alt}{altHealthy ? ' ✓' : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulation Control */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-2 uppercase">
          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          Outage Simulation Control
        </h3>
        <p className="text-[11px] text-slate-500 mb-4">Test that RecoverFlow avoids blind retry loops during degradation</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Bank</label>
            <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)} className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-hidden">
              {bankHealth.map(b => (
                <option key={b.bankCode} value={b.bankCode}>{b.bankCode} — {b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Success Rate: <span className="text-indigo-600 font-bold">{testSuccessRate}%</span>
            </label>
            <input type="range" min="20" max="98" value={testSuccessRate} onChange={(e) => setTestSuccessRate(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSimulate('DEGRADED')} className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
              Degrade ({testSuccessRate}%)
            </button>
            <button onClick={() => handleSimulate('HEALTHY')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
