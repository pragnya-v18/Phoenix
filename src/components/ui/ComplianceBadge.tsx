import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Clock, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { ComplianceEvaluation } from '../../types';

interface ComplianceBadgeProps {
  compliance: ComplianceEvaluation;
  compact?: boolean;
}

export const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({ compliance, compact = false }) => {
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
        compliance.approved
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-rose-200'
      }`}>
        {compliance.approved ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
        {compliance.approved ? 'Compliant' : 'Violation'}
      </span>
    );
  }

  return (
    <div className={`p-3 rounded-xl border space-y-2 ${
      compliance.approved ? 'bg-emerald-50/50 border-emerald-200/70' : 'bg-rose-50/50 border-rose-200/70'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {compliance.approved ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span className="text-[11px] font-bold text-slate-900">
            {compliance.approved ? 'Compliance Cleared' : 'Compliance Violation'}
          </span>
        </div>
        {compliance.requiresHumanApproval && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 animate-pulse">
            <AlertTriangle className="w-2.5 h-2.5" />
            HITL Required
          </span>
        )}
      </div>

      {/* Rules Passed */}
      {compliance.rulesPassed.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {compliance.rulesPassed.map(rule => (
            <span key={rule} className="text-[9px] font-mono font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
              ✓ {rule}
            </span>
          ))}
        </div>
      )}

      {/* Violations */}
      {compliance.violations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {compliance.violations.map(v => (
            <span key={v} className="text-[9px] font-mono font-semibold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
              ✗ {v}
            </span>
          ))}
        </div>
      )}

      {/* Reasoning Summary */}
      {compliance.reasoningSummary && (
        <p className="text-[10px] text-slate-600 leading-relaxed bg-white/60 p-2 rounded-lg border border-slate-200/50">
          {compliance.reasoningSummary}
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-200/50">
        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{new Date(compliance.evaluatedAt).toLocaleTimeString()}</span>
        {compliance.confidenceScore !== undefined && (
          <span>Confidence: {(compliance.confidenceScore * 100).toFixed(0)}%</span>
        )}
      </div>
    </div>
  );
};

interface GovernancePanelProps {
  compliance?: ComplianceEvaluation;
  riskTier?: string;
  amount?: number;
}

const POLICY_RULES = [
  { id: 'QUIET_HOURS', label: 'RBI Quiet Hours (9PM–8AM)', description: 'No outbound messages during restricted hours' },
  { id: 'MAX_DISCOUNT', label: 'Max 10% Discount Cap', description: 'Incentive cannot exceed 10% of transaction value' },
  { id: 'FATIGUE_LIMIT', label: 'Customer Fatigue Guard', description: 'Max 3 messages per customer per 24 hours' },
  { id: 'HITL_THRESHOLD', label: 'HITL Approval Threshold', description: 'Transactions >₹50,000 require human approval' },
  { id: 'ANTI_ABUSE', label: 'Anti-Abuse Detection', description: 'Repeat failure patterns flagged for review' },
  { id: 'OUTAGE_GUARD', label: 'Outage Retry Guard', description: 'Auto-pause retries when bank switch health <50%' }
];

export const GovernancePanel: React.FC<GovernancePanelProps> = ({ compliance, riskTier, amount }) => {
  const hitlThreshold = 50000;
  const requiresHitl = (amount || 0) >= hitlThreshold;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          Policy Governance
        </h3>
        {compliance && (
          <ComplianceBadge compliance={compliance} compact />
        )}
      </div>

      {/* Policy Rules Status */}
      <div className="space-y-1.5">
        {POLICY_RULES.map(rule => {
          const passed = compliance?.rulesPassed.includes(rule.id);
          const violated = compliance?.violations.some(v => v.includes(rule.id) || v.includes(rule.label));
          const isHitlRule = rule.id === 'HITL_THRESHOLD';
          const status = passed ? 'passed' : violated ? 'failed' : 'pending';

          return (
            <div key={rule.id} className={`flex items-center gap-2 p-2 rounded-lg text-[10px] border transition-all ${
              status === 'passed' ? 'bg-emerald-50/50 border-emerald-200/60' :
              status === 'failed' ? 'bg-rose-50/50 border-rose-200/60' :
              'bg-slate-50/50 border-slate-200/60'
            }`}>
              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                status === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                status === 'failed' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-400'
              }`}>
                {status === 'passed' ? <CheckCircle2 className="w-3 h-3" /> :
                 status === 'failed' ? <XCircle className="w-3 h-3" /> :
                 <Clock className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800">{rule.label}</div>
                <div className="text-[9px] text-slate-500">{rule.description}</div>
              </div>
              {isHitlRule && requiresHitl && (
                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded">
                  THRESHOLD HIT
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Risk + Compliance Summary */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px]">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
          <span className="text-slate-400">Risk Tier</span>
          <div className={`font-bold ${
            riskTier === 'CRITICAL' ? 'text-rose-700' :
            riskTier === 'HIGH' ? 'text-orange-700' :
            riskTier === 'MEDIUM' ? 'text-amber-700' :
            'text-emerald-700'
          }`}>{riskTier || 'N/A'}</div>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
          <span className="text-slate-400">HITL Threshold</span>
          <div className="font-bold text-slate-800">₹{hitlThreshold.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
};
