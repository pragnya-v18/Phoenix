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
            <p className="text-[9px] text-slate-500 mt-1">Gemini 3.7 Flash classification confidence based on error code, bank health, and historical patterns</p>
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
      label: 'Economic Optimization',
      icon: Coins,
      content: (
        <div className="space-y-2">
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
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">Expected Net Value</span>
              <div className="font-bold text-emerald-700">
                {formatINR(caseItem.amount * (caseItem.strategy?.expectedRecoveryProbability || 0.78) - (caseItem.strategy?.calculatedIncentiveINR || 0))}
              </div>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400">ROI Multiplier</span>
              <div className="font-bold text-violet-700">
                {caseItem.strategy?.calculatedIncentiveINR ? `${((caseItem.amount * (caseItem.strategy?.expectedRecoveryProbability || 0.78)) / caseItem.strategy.calculatedIncentiveINR).toFixed(1)}x` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Optimization Explanation */}
          <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-200/60">
            <p className="text-[10px] text-indigo-800 leading-relaxed">
              <strong>Optimization Logic:</strong> The strategy optimizer maximizes expected net value = P(recovery) × Amount − Incentive Cost. 
              The {caseItem.strategy?.offeredDiscountPct || 5}% discount was selected because it balances customer willingness-to-pay 
              against margin erosion. Channel {caseItem.strategy?.targetChannel || 'WHATSAPP'} was chosen for its {caseItem.strategy?.targetChannel === 'WHATSAPP' ? '82% recovery rate and interactive buttons' : 
              caseItem.strategy?.targetChannel === 'ACP_A2A' ? '88% autonomous recovery rate and 42ms latency' : 
              'broad reach and cost efficiency'}.
            </p>
          </div>
        </div>
      )
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
