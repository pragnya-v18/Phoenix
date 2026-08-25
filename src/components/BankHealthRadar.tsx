import React, { useState } from 'react';
import { 
  Radio, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  ShieldAlert, 
  Server, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { BankHealthMetric } from '../types';

interface BankHealthRadarProps {
  bankHealth: BankHealthMetric[];
  onSimulateBankStatus: (bankCode: string, successRate: number, status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE') => Promise<void>;
}

export const BankHealthRadar: React.FC<BankHealthRadarProps> = ({
  bankHealth,
  onSimulateBankStatus
}) => {
  const [selectedBank, setSelectedBank] = useState<string>('SBI');
  const [testSuccessRate, setTestSuccessRate] = useState<number>(65);

  const handleSimulate = async (status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE') => {
    await onSimulateBankStatus(selectedBank, testSuccessRate, status);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-600" />
            <span>Indian Banking Switch Telemetry Radar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time health monitoring of NPCI UPI hub and major Indian bank switches (HDFC, SBI, ICICI, Axis)
          </p>
        </div>
      </div>

      {/* Main Grid: Live Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankHealth.map((bank) => (
          <div 
            key={bank.bankCode}
            className={`p-4 rounded-xl border transition-all ${
              bank.status === 'HEALTHY'
                ? 'bg-white border-slate-200/80 shadow-xs'
                : 'bg-amber-50/40 border-amber-300 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{bank.bankCode}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    bank.status === 'HEALTHY'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 animate-pulse border border-amber-300'
                  }`}>
                    {bank.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{bank.name}</div>
              </div>

              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                bank.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-700'
              }`}>
                {bank.status === 'HEALTHY' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-2 mt-3 pt-2.5 border-t border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">15m Rolling Uptime:</span>
                <span className="font-bold text-slate-900 font-mono">{bank.rollingSuccessRatePct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    bank.rollingSuccessRatePct >= 85 ? 'bg-emerald-500' : (bank.rollingSuccessRatePct >= 70 ? 'bg-amber-500' : 'bg-rose-500')
                  }`}
                  style={{ width: `${bank.rollingSuccessRatePct}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-0.5 font-mono">
                <span>Latency: <strong className="text-slate-700">{bank.latencyMs}ms</strong></span>
                <span>Samples: <strong className="text-slate-700">{bank.sampleCountLast15Min.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Simulation Control */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Simulate Banking Switch Outage / Degradation</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Degrade a bank switch to test that RecoverFlow AI avoids blind retry loops during network degradation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Bank Switch</label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-hidden"
            >
              {bankHealth.map(b => (
                <option key={b.bankCode} value={b.bankCode}>{b.bankCode} - {b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Simulated Success Rate: <span className="text-indigo-600 font-bold">{testSuccessRate}%</span>
            </label>
            <input
              type="range"
              min="20"
              max="98"
              value={testSuccessRate}
              onChange={(e) => setTestSuccessRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSimulate('DEGRADED')}
              className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Set Degraded ({testSuccessRate}%)
            </button>
            <button
              onClick={() => handleSimulate('HEALTHY')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Reset Healthy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
