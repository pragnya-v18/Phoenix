import React from 'react';
import { Bot } from 'lucide-react';

interface AgentFunnelCardProps {
  recoveryRate: number;
  totalCases: number;
  recoveredCases: number;
}

export const AgentFunnelCard: React.FC<AgentFunnelCardProps> = ({
  recoveryRate,
  totalCases,
  recoveredCases
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Multi-Agent Conversion Funnel</span>
          </h3>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {Number(recoveryRate).toFixed(1)}% Net Conversion
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Autonomous pass-through conversion rate across the 7 LangGraph agent mesh nodes
        </p>

        <div className="space-y-3.5">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
              <span>1. Detection (Webhook Interception)</span>
              <span className="font-bold text-slate-900">100% ({totalCases} cases)</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-400 rounded-full w-full"></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
              <span>2. Diagnosis (Forensic Telemetry Grounding)</span>
              <span className="font-bold text-slate-900">98.6%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full w-[98.6%]"></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
              <span>3. Negotiation (ACP 2.0 Dialogue)</span>
              <span className="font-bold text-slate-900">91.5%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full w-[91.5%]"></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
              <span>4. Captured & Settled (Razorpay Capture)</span>
              <span className="font-bold text-emerald-700">{Number(recoveryRate).toFixed(1)}% ({recoveredCases} settled)</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${recoveryRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Traditional Dunning: <strong>~28.0%</strong></span>
        <span className="text-emerald-700 font-bold">+173% Lift with RecoverFlow</span>
      </div>
    </div>
  );
};
