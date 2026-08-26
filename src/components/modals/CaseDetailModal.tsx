import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  CreditCard, 
  Send, 
  ExternalLink, 
  Play, 
  Clock, 
  Zap, 
  Building, 
  UserCheck,
  Check,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { RecoveryCase, ChannelType } from '../../types';

interface CaseDetailModalProps {
  caseItem: RecoveryCase;
  onClose: () => void;
  onRunAgent: (caseId: string) => void;
  onHumanAction: (caseId: string, action: 'APPROVE' | 'DISMISS', discountPct?: number, notes?: string, overrideChannel?: ChannelType) => Promise<void>;
  isRunningAgent: boolean;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseItem,
  onClose,
  onRunAgent,
  onHumanAction,
  isRunningAgent
}) => {
  const [overrideDiscount, setOverrideDiscount] = useState<number>(caseItem.strategy?.offeredDiscountPct || 5);
  const [notes, setNotes] = useState('');
  const [overrideChannel, setOverrideChannel] = useState<ChannelType>(caseItem.strategy?.targetChannel || 'WHATSAPP');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    await onHumanAction(caseItem.caseId, 'APPROVE', overrideDiscount, notes, overrideChannel);
    setIsSubmitting(false);
    onClose();
  };

  const handleDismiss = async () => {
    setIsSubmitting(true);
    await onHumanAction(caseItem.caseId, 'DISMISS', 0, notes);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200/90 shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-mono text-base font-bold text-slate-900">{caseItem.caseId}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                caseItem.status === 'RECOVERED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : caseItem.status === 'PENDING_APPROVAL'
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                  : caseItem.status === 'OUTAGE_PAUSED'
                  ? 'bg-rose-50 text-rose-800 border border-rose-300'
                  : caseItem.status === 'COOLDOWN_PROTECTED'
                  ? 'bg-purple-50 text-purple-800 border border-purple-300'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                {caseItem.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {caseItem.eventType.replace('_', ' ')} • Occurred at {new Date(caseItem.createdAt).toLocaleString()}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Customer & Transaction Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Payer Profile
              </div>
              <div className="font-bold text-slate-900 text-xs">{caseItem.customer.name}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{caseItem.customer.phone}</div>
              <div className="text-[11px] text-slate-600">{caseItem.customer.email}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                CLV Tier: {caseItem.customer.clvTier}
              </div>
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Transaction Value
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                ₹{caseItem.amount.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Method: <strong>{caseItem.sourceEvent.method}</strong> ({caseItem.sourceEvent.bankCode || 'N/A'})
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                ID: {caseItem.sourceEvent.paymentId || 'N/A'}
              </div>
            </div>
          </div>

          {/* Global Outage Alert */}
          {caseItem.status === 'OUTAGE_PAUSED' && (
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Global Issuer/Switch Outage Guard Triggered</span>
              </div>
              <p className="text-xs text-rose-800">
                {caseItem.outageStatus?.reason || 'Switch failure rate exceeds 50%. Autonomous retry paused to protect customer experience.'}
              </p>
            </div>
          )}

          {/* Customer Campaign Cooldown Alert */}
          {caseItem.status === 'COOLDOWN_PROTECTED' && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Customer Anti-Fatigue Cooldown Active</span>
              </div>
              <p className="text-xs text-purple-800">
                Throttled by 60-minute anti-fatigue policy. {caseItem.cooldownStatus?.remainingMinutes || 45} minutes remaining before next outbound message.
              </p>
            </div>
          )}

          {/* AI Forensic Diagnosis */}
          {caseItem.diagnosis && (
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI Forensic Root Cause Diagnosis</span>
                </div>
                <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200 font-semibold">
                  {(caseItem.diagnosis.confidenceScore * 100).toFixed(0)}% Confidence
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {caseItem.diagnosis.rootCauseDetail}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 font-mono">
                <span>Category: <strong className="text-slate-800">{caseItem.diagnosis.rootCauseCategory}</strong></span>
                <span>•</span>
                <span>Bank Switch Health: <strong className="text-slate-800">{caseItem.diagnosis.bankSwitchHealthIndex}%</strong></span>
              </div>
            </div>
          )}

          {/* Recovery Strategy & Action */}
          {caseItem.strategy && (
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Formulated Recovery Strategy</span>
                </div>
                {caseItem.strategy.antiAbuseEnforced && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-700" />
                    Anti-Abuse Guard Enforced (0% Discount)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {caseItem.strategy.reasoning}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <div className="text-[10px] text-slate-400 font-medium">Channel Rail</div>
                  <div className="font-bold text-indigo-700">{caseItem.strategy.targetChannel}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70">
                  <div className="text-[10px] text-slate-400 font-medium">Offered Discount</div>
                  <div className="font-bold text-emerald-700">{caseItem.strategy.offeredDiscountPct}%</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/70 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400 font-medium">Backoff Delay</div>
                  <div className="font-bold text-slate-800">{caseItem.strategy.delayMinutes} mins</div>
                </div>
              </div>
            </div>
          )}

          {/* AI-Synthesized Customer Notification Copy & WhatsApp Cloud API Interactive Buttons */}
          {caseItem.strategy?.generatedMessageCopy && (
            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200/70 space-y-2">
              <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI-Synthesized Personalized Notification Copy</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100/70 text-indigo-700 font-mono">
                  {caseItem.strategy.targetChannel}
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 font-sans text-xs text-slate-800 leading-relaxed italic">
                "{caseItem.strategy.generatedMessageCopy}"
              </div>

              {caseItem.strategy.whatsAppInteractivePayload && (
                <div className="mt-2 pt-2 border-t border-indigo-100/80">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Send className="w-3 h-3 text-emerald-600" />
                    <span>WhatsApp Cloud API Interactive Action Buttons</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(caseItem.strategy.whatsAppInteractivePayload.interactive?.action?.buttons || caseItem.strategy.whatsAppInteractivePayload.action?.buttons || []).map((btn, idx) => (
                      <span key={idx} className="bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-xs">
                        {btn.reply.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Post-Recovery Insights & Financial Breakdown */}
          {caseItem.outcome && (
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/70 space-y-2">
              <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Post-Recovery Settlement & Financial Accounting</span>
                </span>
                <span className="font-mono text-xs font-bold text-emerald-800">
                  Settled: ₹{caseItem.outcome.recoveredAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {caseItem.outcome.businessInsights && (
                <p className="text-xs text-emerald-900 leading-relaxed">
                  {caseItem.outcome.businessInsights}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-slate-400">Incentive Cost</div>
                  <div className="font-bold text-amber-700">₹{caseItem.outcome.costOfIncentiveINR || 0}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-slate-400">MDR/Interchange Fee</div>
                  <div className="font-bold text-slate-800">₹{caseItem.outcome.estimatedMdrFeeINR || 0} ({caseItem.outcome.mdrRatePct || 1.9}%)</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-slate-400">Net Revenue Saved</div>
                  <div className="font-bold text-emerald-700">
                    ₹{(caseItem.outcome.recoveredAmount - (caseItem.outcome.costOfIncentiveINR || 0) - (caseItem.outcome.estimatedMdrFeeINR || 0)).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-slate-400">Velocity</div>
                  <div className="font-bold text-indigo-700">{caseItem.outcome.timeToRecoverSeconds}s</div>
                </div>
              </div>
            </div>
          )}

          {/* Human in the Loop Clearance Controls (If Pending Approval) */}
          {caseItem.status === 'PENDING_APPROVAL' && (
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-300 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Human-In-The-Loop Clearance Required</span>
              </div>
              <p className="text-xs text-amber-800">
                {caseItem.compliance?.violations?.join(', ') || 'High-value transaction threshold requires executive approval.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Override Discount Rate ({overrideDiscount}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={overrideDiscount}
                  onChange={(e) => setOverrideDiscount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Channel
                </label>
                <select
                  value={overrideChannel}
                  onChange={(e) => setOverrideChannel(e.target.value as ChannelType)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                  <option value="VOICE_CALL">Voice Call</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operator Clearance Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g., Authorized VIP customer retention discount"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  disabled={isSubmitting}
                  onClick={handleApprove}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Dispatch Recovery</span>
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Dismiss Case
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200/80 px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Hash: {caseItem.sourceEvent.orderId || caseItem.caseId}
          </span>

          <div className="flex items-center gap-2">
            {caseItem.status !== 'RECOVERED' && caseItem.status !== 'PENDING_APPROVAL' && (
              <button
                disabled={isRunningAgent}
                onClick={() => {
                  onRunAgent(caseItem.caseId);
                  onClose();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>Run Agent Step</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
