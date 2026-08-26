import React, { useState } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare,
  Sliders,
  Lock,
  Radio
} from 'lucide-react';
import { RecoveryCase } from '../types';

interface AcpSandboxViewProps {
  cases: RecoveryCase[];
  selectedCase: RecoveryCase | null;
  onSelectCase: (c: RecoveryCase) => void;
  onSendNegotiation: (caseId: string, intent: string, payload: any) => Promise<void>;
  isSending: boolean;
}

export const AcpSandboxView: React.FC<AcpSandboxViewProps> = ({
  cases,
  selectedCase,
  onSelectCase,
  onSendNegotiation,
  isSending
}) => {
  const currentCase = selectedCase || cases[0];
  const dialogue = currentCase?.acpSession?.dialogue || [];
  const [customIntent, setCustomIntent] = useState<'ACCEPT_AND_COMMIT' | 'REQUEST_MORE_DISCOUNT' | 'CHANGE_PAYMENT_METHOD'>('ACCEPT_AND_COMMIT');

  const handleAction = async () => {
    if (!currentCase) return;
    if (customIntent === 'ACCEPT_AND_COMMIT') {
      await onSendNegotiation(currentCase.caseId, 'ACCEPT_AND_COMMIT', { selectedMethod: 'CARD', acceptProposedOffer: true });
    } else if (customIntent === 'REQUEST_MORE_DISCOUNT') {
      await onSendNegotiation(currentCase.caseId, 'COUNTER_OFFER', { requestDiscountIncrease: true, requestedDiscountPct: 8.0 });
    } else {
      await onSendNegotiation(currentCase.caseId, 'PROPOSE_OFFER', { selectedMethod: 'NETBANKING', message: 'Customer agent proposes ICICI Netbanking fallback' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            ACP 2.0 Protocol Monitor
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Agent-to-Agent Commerce Protocol · Merchant ↔ Customer Wallet dialogue
          </p>
        </div>
        {cases.length > 0 && (
          <select
            value={currentCase?.caseId}
            onChange={(e) => {
              const target = cases.find(c => c.caseId === e.target.value);
              if (target) onSelectCase(target);
            }}
            className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold text-indigo-700 shadow-xs focus:outline-hidden"
          >
            {cases.map(c => (
              <option key={c.caseId} value={c.caseId}>{c.caseId} — {c.customer.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Dialogue Console */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
          <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="font-mono font-bold text-slate-200">
                ACP-v2.0 · Session {currentCase?.acpSession?.sessionId?.slice(0, 16) || 'active'}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-700/50">
              {currentCase?.acpSession?.status || 'ESTABLISHED'}
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950">
            {dialogue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-400">No active ACP dialogue</p>
                <p className="text-[11px] text-slate-600 mt-1">Select a case with an active session</p>
              </div>
            ) : (
              dialogue.map((msg, index) => {
                const isMerchant = msg.sender === 'MerchantRecoveryAgent';
                return (
                  <div key={msg.id ? `${msg.id}_${index}` : `acp_${index}`} className={`flex items-start gap-2.5 ${isMerchant ? '' : 'justify-end'}`}>
                    {isMerchant && (
                      <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3" />
                      </div>
                    )}
                    <div className={`max-w-md rounded-xl p-3 text-xs leading-relaxed ${
                      isMerchant ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-indigo-600 text-white'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`font-bold text-[10px] ${isMerchant ? 'text-indigo-400' : 'text-indigo-200'}`}>
                          {isMerchant ? 'RecoverFlow Agent' : 'Customer Wallet Agent'}
                        </span>
                        <span className={`text-[10px] font-mono ${isMerchant ? 'text-slate-500' : 'text-indigo-300'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p>{msg.payload?.message || `${msg.intent}: ${msg.sender}`}</p>
                      {msg.payload?.discountPct !== undefined && msg.payload.discountPct > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Incentive</span>
                          <span className="font-bold text-emerald-400">{msg.payload.discountPct}% discount</span>
                        </div>
                      )}
                      {msg.payload?.selectedMethod && (
                        <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Committed Rail</span>
                          <span className="font-mono font-bold text-indigo-300">{msg.payload.selectedMethod}</span>
                        </div>
                      )}
                    </div>
                    {!isMerchant && (
                      <div className="w-6 h-6 rounded-md bg-slate-700 text-white flex items-center justify-center shrink-0">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer Agent Control</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-4">Simulate wallet agent responses</p>

            <div className="space-y-2">
              {[
                { value: 'ACCEPT_AND_COMMIT' as const, label: 'Accept & Commit', desc: 'Switch to saved card & capture' },
                { value: 'REQUEST_MORE_DISCOUNT' as const, label: 'Counter-Offer (8%)', desc: 'Test discount guardrails' },
                { value: 'CHANGE_PAYMENT_METHOD' as const, label: 'Switch to Netbanking', desc: 'Bypass degraded HDFC switch' }
              ].map(opt => (
                <label key={opt.value} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs transition-colors">
                  <input type="radio" name="intent" checked={customIntent === opt.value} onChange={() => setCustomIntent(opt.value)} className="mt-0.5 text-indigo-600 accent-indigo-600" />
                  <div>
                    <div className="font-semibold text-slate-900">{opt.label}</div>
                    <div className="text-[10px] text-slate-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button disabled={isSending || !currentCase} onClick={handleAction} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Transmitting...' : 'Dispatch ACP Action'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
