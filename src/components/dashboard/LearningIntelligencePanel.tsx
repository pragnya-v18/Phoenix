import React, { useEffect, useState } from 'react';
import { BrainCircuit, RefreshCw, Target, Crosshair, Layers, TrendingUp } from 'lucide-react';

interface ChannelEffectiveness {
  channel: string;
  attempts: number;
  successRatePct: number;
  recoveredINR: number;
}

interface CalibrationBucket {
  bucket: string;
  count: number;
  avgPredictedPct: number;
  actualSuccessPct: number;
}

interface LearningMetrics {
  casesLearnedFrom: number;
  predictionAccuracyPct: number;
  falsePositives: number;
  falseNegatives: number;
  avgPredictedPct: number;
  calibration: CalibrationBucket[];
  channelEffectiveness: ChannelEffectiveness[];
  correctedExamples: string[];
  mintedAt: string;
}

const formatINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const LearningIntelligencePanel: React.FC = () => {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [evidenceExamples, setEvidenceExamples] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/learning/evidence');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMetrics(data.metrics);
      setEvidenceExamples(data.evidenceExamples || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load learning evidence');
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  const stat = (label: string, value: string, sub: string, accent: string) => (
    <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-3">
      <div className={`text-2xl font-bold font-mono ${accent}`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-600 mt-0.5">{label}</div>
      <div className="text-[9px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <BrainCircuit className="w-4 h-4 text-violet-600" />
          <span>Recovery Intelligence — How Phoenix Learns From Experience</span>
        </h3>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Terminals outcomes (predicted vs actual) feed a closed feedback loop: historical experience adjusts recovery
        confidence and channel selection for similar future cases — no retraining, no vector DB. Live refresh every 6s.
      </p>

      {error && !metrics && (
        <div className="py-6 text-center">
          <Target className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400 max-w-[320px] mx-auto">
            Learning telemetry is warming up — the panel populates as the recovery loop records outcomes for the live case set.
          </p>
        </div>
      )}

      {!metrics && !error && (
        <div className="py-6 text-center">
          <Target className="w-7 h-7 text-violet-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400 max-w-[320px] mx-auto">
            Collecting learning evidence from terminal outcomes. Data appears as cases resolve.
          </p>
        </div>
      )}

      {metrics && (
        <div className="space-y-4">
          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stat('Prediction Accuracy', `${metrics.predictionAccuracyPct.toFixed(1)}%`, 'correct above/below 50% threshold', 'text-emerald-600')}
            {stat('Cases Learned From', String(metrics.casesLearnedFrom), 'recorded terminal outcomes', 'text-indigo-600')}
            {stat('Avg Predicted Confidence', `${metrics.avgPredictedPct.toFixed(0)}%`, 'mean AI recovery probability', 'text-violet-600')}
            {stat('Calibration Samples', String(metrics.calibration.reduce((s, b) => s + b.count, 0)), 'outcomes in confidence buckets', 'text-slate-700')}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> False positives (predicted ≥65% but failed): {metrics.falsePositives}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> False negatives (predicted ≤40% but recovered): {metrics.falseNegatives}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Channel success rates */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Channel Success Rates</span>
              </div>
              {metrics.channelEffectiveness.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No channel outcomes recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {metrics.channelEffectiveness.slice(0, 4).map(ch => (
                    <div key={ch.channel}>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-mono font-semibold text-slate-700">{ch.channel}</span>
                        <span className="text-slate-500">
                          {ch.attempts} attempt{ch.attempts === 1 ? '' : 's'} · {ch.successRatePct.toFixed(1)}% · {formatINR(ch.recoveredINR)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.max(2, ch.successRatePct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calibration */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Crosshair className="w-3.5 h-3.5 text-violet-600" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Confidence Calibration — predicted vs actual</span>
              </div>
              {metrics.calibration.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">Insufficient outcomes to calibrate.</p>
              ) : (
                <div className="space-y-1.5">
                  {metrics.calibration.map(b => (
                    <div key={b.bucket} className="flex items-center justify-between text-[10px] py-1 border-b border-slate-200/60 last:border-0">
                      <span className="font-semibold text-slate-600">predicted {b.bucket}</span>
                      <span className="text-slate-400">n={b.count}</span>
                      <span className="font-mono font-medium text-slate-800">avg {b.avgPredictedPct}%</span>
                      <span className="font-mono font-bold text-violet-700">actual {b.actualSuccessPct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Learning Evidence examples */}
          <div className="bg-violet-50/60 rounded-xl border border-violet-200/60 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-violet-700" />
              <span className="text-[10px] font-bold text-violet-800 uppercase tracking-wide">Learning Evidence — history just influenced a live decision</span>
            </div>
            {evidenceExamples.length === 0 ? (
              <p className="text-[10px] text-violet-700/70 italic">
                No probability/channel adjustments yet. Adjustments get stamped when ≥3 similar historical cases exist for a profile.
              </p>
            ) : (
              <div className="space-y-1.5">
                {evidenceExamples.map((ex, i) => (
                  <div key={i} className="text-[10px] text-violet-900 leading-relaxed bg-white/70 border border-violet-200/50 rounded-lg px-2.5 py-2">
                    {ex}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Self-corrections */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-3">
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-2">Self-Corrections (false positives / false negatives)</div>
            {metrics.correctedExamples.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">No corrections recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {metrics.correctedExamples.map((ex, i) => (
                  <div key={i} className="text-[10px] text-slate-600 leading-relaxed bg-white border border-slate-200/60 rounded-lg px-2.5 py-2">{ex}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningIntelligencePanel;