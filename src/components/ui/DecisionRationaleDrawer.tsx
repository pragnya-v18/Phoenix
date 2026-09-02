import React, { useState } from 'react';
import { 
  BrainCircuit, 
  ChevronDown, 
  ChevronRight,
  Zap,
  Target,
  ShieldCheck,
  Coins,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Bot,
  Sparkles
} from 'lucide-react';
import { RecoveryCase } from '../../types';
import { formatINR } from '../../utils/formatters';

interface DecisionRationaleDrawerProps {
  caseItem: RecoveryCase;
}

interface RationaleSection {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  content: React.ReactNode;
}

export const DecisionRationaleDrawer: React.FC<DecisionRationaleDrawerProps> = ({ caseItem }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('inputs');

  const sections: RationaleSection[] = [
    {
      id: 'inputs',
      label: 'Inputs Considered',
      icon: BrainCircuit,
      content: (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Event Type</span>
              <div className="font-semibold text-slate-800">{caseItem.eventType.replace('_', ' ')}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Amount</span>
              <div className="font-semibold text-slate-800">{formatINR(caseItem.amount)}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Payment Method</span>
              <div className="font-semibold text-slate-800">{caseItem.sourceEvent.method}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Error Code</span>
              <div className="font-mono font-semibold text-slate-800">{caseItem.sourceEvent.errorCode}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Customer CLV Tier</span>
              <div className="font-semibold text-indigo-700">{caseItem.customer.clvTier}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Risk Tier</span>
              <div className={`font-semibold ${
                caseItem.riskTier === 'CRITICAL' ? 'text-rose-700' :
                caseItem.riskTier === 'HIGH' ? 'text-orange-700' :
                caseItem.riskTier === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'
              }`}>{caseItem.riskTier}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Bank Code</span>
              <div className="font-mono font-semibold text-slate-800">{caseItem.sourceEvent.bankCode || 'N/A'}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Bank Health Index</span>
              <div className={`font-mono font-semibold ${
                (caseItem.diagnosis?.bankSwitchHealthIndex || 0) >= 80 ? 'text-emerald-700' :
                (caseItem.diagnosis?.bankSwitchHealthIndex || 0) >= 60 ? 'text-amber-700' : 'text-rose-700'
              }`}>{caseItem.diagnosis?.bankSwitchHealthIndex || 'N/A'}%</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'confidence',
      label: 'Confidence Breakdown',
      icon: BarChart3,
      content: (
        <div className="space-y-2">
          {/* Diagnosis Confidence */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-700">Root Cause Diagnosis</span>
              <span className="font-mono text-[11px] font-bold text-indigo-700">
                {caseItem.diagnosis ? `${(caseItem.diagnosis.confidenceScore * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(caseItem.diagnosis?.confidenceScore || 0) * 100}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Gemini 2.0 Flash classification confidence based on error code, bank health, and historical patterns</p>
          </div>

          {/* Strategy Confidence */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-700">Recovery Strategy</span>
              <span className="font-mono text-[11px] font-bold text-violet-700">
                {caseItem.strategy?.confidenceScore ? `${(caseItem.strategy.confidenceScore * 100).toFixed(0)}%` : (caseItem.strategy ? '78%' : 'N/A')}
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${((caseItem.strategy?.confidenceScore || 0.78)) * 100}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Expected recovery probability based on channel selection, incentive level, and customer segment</p>
          </div>

          {/* Overall Confidence */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-700">Overall Pipeline Confidence</span>
              <span className="font-mono text-[11px] font-bold text-emerald-700">
                {caseItem.diagnosis && caseItem.strategy ? `${((caseItem.diagnosis.confidenceScore * 0.4 + (caseItem.strategy.confidenceScore || 0.78) * 0.6) * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(caseItem.diagnosis ? caseItem.diagnosis.confidenceScore * 0.4 + (caseItem.strategy?.confidenceScore || 0.78) * 0.6 : 0) * 100}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Weighted average: 40% diagnosis + 60% strategy confidence</p>
          </div>
        </div>
      )
    },
    {
      id: 'economic',
      label: 'Action Economics (Expected Value)',
      icon: Coins,
      content: (
        <div className="space-y-2">
          {caseItem.strategy?.ev ? (
            <>
              {/* EV Verdict */}
              <div className={`p-2.5 rounded-lg border ${caseItem.strategy.ev.isNegativeEV ? 'bg-rose-50/50 border-rose-200/70' : 'bg-emerald-50/50 border-emerald-200/70'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700">Expected Value</span>
                  <span className={`font-mono text-sm font-bold ${caseItem.strategy.ev.isNegativeEV ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatINR(caseItem.strategy.ev.expectedValueINR)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                    caseItem.strategy.ev.isNegativeEV
                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                    {caseItem.strategy.ev.isNegativeEV ? 'REJECTED — negative EV' : 'APPROVED — positive EV'}
                  </span>
                  <span className="text-[9px] text-slate-400">deterministic guardrail stage</span>
                </div>
              </div>

              {/* EV Breakdown */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                <div className="text-[10px] font-bold text-slate-700 mb-1.5">EV Breakdown · {Math.round(caseItem.strategy.ev.successProbability * 100)}% P × {formatINR(caseItem.strategy.ev.netRecoverableINR)} net</div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross expected capture</span>
                    <span className="font-mono font-semibold text-emerald-700">+{formatINR(caseItem.strategy.ev.grossExpectedINR)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Incentive cost</span>
                    <span className="font-mono font-semibold text-rose-600">−{formatINR(caseItem.strategy.ev.incentiveINR)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MDR + GST</span>
                    <span className="font-mono font-semibold text-rose-600">−{formatINR(caseItem.strategy.ev.mdrFeeINR)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Channel ops</span>
                    <span className="font-mono font-semibold text-rose-600">−{formatINR(caseItem.strategy.ev.opsCostINR)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer friction ({caseItem.strategy?.targetChannel})</span>
                    <span className="font-mono font-semibold text-rose-600">−{formatINR(caseItem.strategy.ev.frictionPenaltyINR)}</span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">{caseItem.strategy.ev.rationale}</p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400">Transaction Value</span>
                <div className="font-bold text-slate-900">{formatINR(caseItem.amount)}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400">Offered Discount</span>
                <div className="font-bold text-emerald-700">{caseItem.strategy?.offeredDiscountPct || 0}%</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400">Incentive Cost</span>
                <div className="font-bold text-amber-700">{formatINR(caseItem.strategy?.calculatedIncentiveINR || 0)}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400">Expected Recovery Prob</span>
                <div className="font-bold text-indigo-700">{((caseItem.strategy?.expectedRecoveryProbability || 0.78) * 100).toFixed(0)}%</div>
              </div>
            </div>
          )}

          {/* Optimization Explanation */}
          <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-200/60">
            <p className="text-[10px] text-indigo-800 leading-relaxed">
              <strong>Optimization Logic:</strong> EV = P(recovery) × Net Amount − (Incentive + MDR + Ops + Friction).
              The {caseItem.strategy?.offeredDiscountPct || 5}% incentive was selected because it pays for itself at the
              estimated {((caseItem.strategy?.expectedRecoveryProbability || 0.78) * 100).toFixed(0)}% recovery probability.
              Channel {caseItem.strategy?.targetChannel || 'WHATSAPP'} was chosen for its {
              caseItem.strategy?.targetChannel === 'WHATSAPP' ? '82% recovery rate and interactive buttons' : 
              caseItem.strategy?.targetChannel === 'ACP_A2A' ? '88% autonomous recovery rate and 42ms latency' : 
              'broad reach and cost efficiency'}. Negative-EV actions are rejected before they reach execution.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'learning',
      label: 'Learning Evidence (Predicted vs History)',
      icon: TrendingUp,
      content: (() => {
        const ev = caseItem.strategy?.recoveryEvidence;
        if (!ev) {
          return (
            <div className="text-[10px] text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              No historical evidence adjustment stamped yet — will appear after ≥3 similar cases have resolved through the feedback loop.
            </div>
          );
        }
        const stamp = ev.influence.replace(/-/g, ' ');
        return (
          <div className="space-y-2">
            <div className="bg-violet-50/60 p-3 rounded-lg border border-violet-200/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-violet-800">Historical Evidence · {ev.similarCases} similar cases</span>
                <span className="text-[9px] font-mono font-semibold text-violet-700">{ev.historicalSuccessRatePct.toFixed(1)}% success</span>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Raw AI predicted probability</span>
                  <span className="font-mono font-semibold text-slate-800">{ev.rawProbability.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">History-adjusted probability</span>
                  <span className="font-mono font-bold text-violet-700">{ev.adjustedProbability.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            {ev.recommendedChannel && (
              <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-200/70">
                <p className="text-[10px] text-indigo-900 leading-relaxed">
                  <strong>Channel recommendation:</strong> historical outcomes favor{' '}
                  <span className="font-mono font-bold">{ev.recommendedChannel}</span> for this profile (currently routed to{' '}
                  <span className="font-mono font-semibold">{caseItem.strategy?.targetChannel}</span>). Human operator can override after compliance review.
                </p>
              </div>
            )}
            <p className="text-[9px] text-slate-400 leading-relaxed">
              Outcome stamp: {stamp}. Evidence adjusts only the decision signal — compliance, settlement guard and EV verdicts still run unchanged.
            </p>
          </div>
        );
      })()
    },
    {
      id: 'compliance',
      label: 'Compliance Constraints',
      icon: ShieldCheck,
      content: (
        <div className="space-y-2">
          {caseItem.compliance ? (
            <>
              {/* Rules Passed */}
              {caseItem.compliance.rulesPassed.length > 0 && (
                <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/60">
                  <div className="text-[10px] font-bold text-emerald-800 mb-1">Rules Passed</div>
                  <div className="flex flex-wrap gap-1">
                    {caseItem.compliance.rulesPassed.map(rule => (
                      <span key={rule} className="text-[9px] font-mono font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                        ✓ {rule}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Violations */}
              {caseItem.compliance.violations.length > 0 && (
                <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-200/60">
                  <div className="text-[10px] font-bold text-rose-800 mb-1">Violations Detected</div>
                  <div className="flex flex-wrap gap-1">
                    {caseItem.compliance.violations.map(v => (
                      <span key={v} className="text-[9px] font-mono font-semibold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                        ✗ {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {caseItem.compliance.reasoningSummary && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <div className="text-[10px] font-bold text-slate-700 mb-1">Compliance Reasoning</div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">{caseItem.compliance.reasoningSummary}</p>
                </div>
              )}

              {/* HITL Decision */}
              {caseItem.compliance.requiresHumanApproval && (
                <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-300">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Human approval required — transaction exceeds ₹50,000 threshold
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-[10px] text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              Compliance evaluation pending — will be assessed before execution.
            </div>
          )}
        </div>
      )
    },
    {
      id: 'reasoning',
      label: 'Strategy Reasoning',
      icon: Sparkles,
      content: (
        <div className="space-y-2">
          {/* Root Cause */}
          {caseItem.diagnosis && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <div className="text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3 text-indigo-600" />
                Root Cause Analysis
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">{caseItem.diagnosis.rootCauseDetail}</p>
              <div className="mt-1.5 text-[9px] font-mono text-slate-400">
                Category: {caseItem.diagnosis.rootCauseCategory} · Transient: {caseItem.diagnosis.isTransient ? 'Yes' : 'No'} · Rail Switch: {caseItem.diagnosis.recommendedRailSwitch}
              </div>
            </div>
          )}

          {/* Strategy */}
          {caseItem.strategy && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <div className="text-[10px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Target className="w-3 h-3 text-violet-600" />
                Recovery Strategy
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">{caseItem.strategy.reasoning}</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[9px]">
                <div className="bg-white p-1.5 rounded border border-slate-200/60">
                  <span className="text-slate-400">Action</span>
                  <div className="font-semibold text-slate-800">{caseItem.strategy.recommendedAction.replace('_', ' ')}</div>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200/60">
                  <span className="text-slate-400">Delay</span>
                  <div className="font-semibold text-slate-800">{caseItem.strategy.delayMinutes}m</div>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200/60">
                  <span className="text-slate-400">Anti-Abuse</span>
                  <div className={`font-semibold ${caseItem.strategy.antiAbuseEnforced ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {caseItem.strategy.antiAbuseEnforced ? 'Enforced' : 'Clear'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message Copy */}
          {caseItem.strategy?.generatedMessageCopy && (
            <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-200/60">
              <div className="text-[10px] font-bold text-indigo-800 mb-1">Generated Message</div>
              <p className="text-[10px] text-indigo-900 leading-relaxed italic">"{caseItem.strategy.generatedMessageCopy}"</p>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
        <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
        <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">Decision Rationale</span>
        <span className="text-[9px] font-mono text-slate-400 ml-auto">{caseItem.caseId}</span>
      </div>

      <div className="divide-y divide-slate-100">
        {sections.map(section => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;
          return (
            <div key={section.id}>
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[11px] font-semibold text-slate-800">{section.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
              {isExpanded && (
                <div className="px-4 pb-3">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
