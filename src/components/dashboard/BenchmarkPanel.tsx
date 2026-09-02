import React, { useState } from 'react';
import { BarChart3, Play, ShieldCheck, RefreshCw } from 'lucide-react';

interface BenchmarkBucket {
  dispatchedCases: number;
  recoveredCases: number;
  recoveredINR: number;
  incentiveINR: number;
  mdrINR: number;
  opsINR: number;
  netINR: number;
  duplicateChargeRiskCases: number;
}

interface BenchmarkRun {
  runAt: string;
  model: 'projected';
  casesEvaluated: number;
  baseline: BenchmarkBucket;
  agent: BenchmarkBucket;
  rulesAgent: BenchmarkBucket;
  upliftPct: number;
  aiVsRulesDeltaPct: number;
  heldThoseCases: string[];
}

const formatINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const BenchmarkPanel: React.FC = () => {
  const [benchmark, setBenchmark] = useState<BenchmarkRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBenchmark = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/simulate/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBenchmark(data.benchmark);
    } catch (e: any) {
      setError(e?.message || 'Benchmark failed');
    } finally {
      setRunning(false);
    }
  };

  const row = (label: string, b: number, r: number, a: number, money = false) => (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-400 w-24 text-right">{money ? formatINR(b) : Number(b).toFixed(1)}</span>
      <span className="font-mono text-slate-500 w-24 text-right">{money ? formatINR(r) : Number(r).toFixed(1)}</span>
      <span className="font-mono text-slate-900 w-24 text-right font-semibold">{money ? formatINR(a) : Number(a).toFixed(1)}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span>Baseline Benchmark — Naive vs Rules vs AI Agent</span>
        </h3>
        <button
          onClick={runBenchmark}
          disabled={running}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Running…' : 'Run Benchmark'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Deterministic, offline replay of the live case set. No Gemini / gateway calls — projected expected-value model.
      </p>

      {error && (
        <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{error}</div>
      )}

      {!benchmark && !running && (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-xs text-slate-400 max-w-[280px]">
            Press <span className="font-semibold text-slate-600">Run Benchmark</span> to compare the AI agent against both a blind fixed-schedule retry and a static rules engine.
          </p>
        </div>
      )}

      {benchmark && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wide font-bold text-slate-500">
            <span>Metric</span>
            <span className="text-right">Naive</span>
            <span className="text-right">Rules</span>
            <span className="text-right text-indigo-700">AI Agent</span>
          </div>

          {row('Cases evaluated', benchmark.casesEvaluated, benchmark.casesEvaluated, benchmark.casesEvaluated)}
          {row('Dispatched', benchmark.baseline.dispatchedCases, benchmark.rulesAgent.dispatchedCases, benchmark.agent.dispatchedCases)}
          {row('Recovered (expected)', benchmark.baseline.recoveredCases, benchmark.rulesAgent.recoveredCases, benchmark.agent.recoveredCases)}
          {row('Recovered revenue', benchmark.baseline.recoveredINR, benchmark.rulesAgent.recoveredINR, benchmark.agent.recoveredINR, true)}
          {row('Incentive cost', benchmark.baseline.incentiveINR, benchmark.rulesAgent.incentiveINR, benchmark.agent.incentiveINR, true)}
          {row('MDR + ops cost', benchmark.baseline.mdrINR + benchmark.baseline.opsINR, benchmark.rulesAgent.mdrINR + benchmark.rulesAgent.opsINR, benchmark.agent.mdrINR + benchmark.agent.opsINR, true)}
          {row('Net margin saved', benchmark.baseline.netINR, benchmark.rulesAgent.netINR, benchmark.agent.netINR, true)}
          {row('Unvetted dispatches', benchmark.baseline.duplicateChargeRiskCases, benchmark.rulesAgent.duplicateChargeRiskCases, benchmark.agent.duplicateChargeRiskCases)}

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Net uplift over naive retry</span>
              <span className="text-sm font-mono font-bold text-emerald-600">+{benchmark.upliftPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">AI advantage over static rules engine</span>
              <span className="text-sm font-mono font-bold text-indigo-600">+{benchmark.aiVsRulesDeltaPct}%</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Rules column uses a static probability table (event, amount, bank health) with the same compliance double-charge rails — only the decision signal differs.
            </p>
          </div>

          {benchmark.heldThoseCases.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                {benchmark.heldThoseCases.length} dispatches prevented — naive blind retry would have sent these
              </div>
              {benchmark.heldThoseCases.slice(0, 4).map(h => (
                <div key={h} className="text-[10px] font-mono text-amber-700/90">{h}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};