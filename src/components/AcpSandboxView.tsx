import React, { useState } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  RefreshCw,
  Sliders,
  MessageSquare
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
      await onSendNegotiation(currentCase.caseId, 'ACCEPT_AND_COMMIT', {
        selectedMethod: 'CARD',
        acceptProposedOffer: true
      });
    } else if (customIntent === 'REQUEST_MORE_DISCOUNT') {
      await onSendNegotiation(currentCase.caseId, 'COUNTER_OFFER', {
        requestDiscountIncrease: true,
        requestedDiscountPct: 8.0
      });
    } else {
      await onSendNegotiation(currentCase.caseId, 'PROPOSE_OFFER', {
        selectedMethod: 'NETBANKING',
        message: 'Customer agent proposes paying via ICICI Netbanking fallback'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>ACP 2.0 Agent-to-Agent Commerce Sandbox</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstration of Agentic Commerce Protocol (ACP/UCP) autonomous dialogue between Merchant and Customer Wallet Agent
          </p>
        </div>

        {cases.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Session Case:</span>
            <select
              value={currentCase?.caseId}
              onChange={(e) => {
                const target = cases.find(c => c.caseId === e.target.value);
                if (target) onSelectCase(target);
              }}
              className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 shadow-xs focus:outline-hidden"
            >
              {cases.map(c => (
                <option key={c.caseId} value={c.caseId}>
                  {c.caseId} ({c.customer.name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Terminal View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dialogue Console */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
          {/* Top Bar */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono font-bold text-slate-800">
                ACP-v2.0 :: Session {currentCase?.acpSession?.sessionId?.slice(0, 16) || 'active'}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              STATUS: {currentCase?.acpSession?.status || 'ESTABLISHED'}
            </span>
          </div>

          {/* Dialogue Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40">
            {dialogue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No active ACP dialogue session loaded</p>
                <p className="text-[11px] text-slate-400 mt-1">Select an active case or trigger a simulation from the header</p>
              </div>
            ) : (
              dialogue.map((msg, index) => (
                <div
                  key={msg.id ? `${msg.id}_${index}` : `acp_msg_${index}`}
                  className={`flex items-start gap-3 ${
                    msg.sender === 'MerchantRecoveryAgent' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {msg.sender === 'MerchantRecoveryAgent' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-md rounded-xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'MerchantRecoveryAgent'
                      ? 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                      : 'bg-indigo-600 text-white shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`font-bold text-[11px] ${
                        msg.sender === 'MerchantRecoveryAgent' ? 'text-indigo-700' : 'text-indigo-200'
                      }`}>
                        {msg.sender === 'MerchantRecoveryAgent' ? 'RecoverFlow Agent (Merchant)' : 'Customer Wallet Agent'}
                      </span>
                      <span className={`text-[10px] font-mono ${
                        msg.sender === 'MerchantRecoveryAgent' ? 'text-slate-400' : 'text-indigo-200'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p>{msg.payload?.message || `${msg.intent}: ${msg.sender}`}</p>

                    {msg.payload?.discountPct !== undefined && msg.payload.discountPct > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Incentive Applied:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {msg.payload.discountPct}% Discount
                        </span>
                      </div>
                    )}

                    {msg.payload?.selectedMethod && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Committed Rail:</span>
                        <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                          {msg.payload.selectedMethod}
                        </span>
                      </div>
                    )}
                  </div>

                  {msg.sender !== 'MerchantRecoveryAgent' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Interactive Control Panel */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Customer Agent Responder</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Simulate actions from the customer's wallet agent to test protocol negotiation
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Customer Agent Intent:
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs transition-colors">
                    <input
                      type="radio"
                      name="intent"
                      checked={customIntent === 'ACCEPT_AND_COMMIT'}
                      onChange={() => setCustomIntent('ACCEPT_AND_COMMIT')}
                      className="mt-0.5 text-indigo-600 accent-indigo-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Accept & Commit</div>
                      <div className="text-[11px] text-slate-500">Switch payment rail to saved card & execute capture</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs transition-colors">
                    <input
                      type="radio"
                      name="intent"
                      checked={customIntent === 'REQUEST_MORE_DISCOUNT'}
                      onChange={() => setCustomIntent('REQUEST_MORE_DISCOUNT')}
                      className="mt-0.5 text-indigo-600 accent-indigo-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Counter-Offer (8% Discount)</div>
                      <div className="text-[11px] text-slate-500">Test autonomous EV & discount guardrails</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer text-xs transition-colors">
                    <input
                      type="radio"
                      name="intent"
                      checked={customIntent === 'CHANGE_PAYMENT_METHOD'}
                      onChange={() => setCustomIntent('CHANGE_PAYMENT_METHOD')}
                      className="mt-0.5 text-indigo-600 accent-indigo-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Switch to ICICI Netbanking</div>
                      <div className="text-[11px] text-slate-500">Bypass degraded HDFC switch</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              disabled={isSending || !currentCase}
              onClick={handleAction}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Transmitting...' : 'Dispatch ACP Action'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
