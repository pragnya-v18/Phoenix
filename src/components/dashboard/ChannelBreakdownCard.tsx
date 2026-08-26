import React from 'react';
import { Send, MessageSquare, Zap, Smartphone, Mail, CreditCard } from 'lucide-react';
import { ChannelRecoveryMetric } from '../../types';

interface ChannelBreakdownCardProps {
  channelData: ChannelRecoveryMetric[];
}

const getChannelIcon = (ch: string) => {
  switch (ch) {
    case 'WHATSAPP': return <MessageSquare className="w-4 h-4 text-emerald-600" />;
    case 'ACP_A2A': return <Zap className="w-4 h-4 text-indigo-600" />;
    case 'SMS': return <Smartphone className="w-4 h-4 text-sky-600" />;
    case 'EMAIL': return <Mail className="w-4 h-4 text-amber-600" />;
    default: return <CreditCard className="w-4 h-4 text-slate-600" />;
  }
};

export const ChannelBreakdownCard: React.FC<ChannelBreakdownCardProps> = ({ channelData }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Send className="w-4 h-4 text-indigo-600" />
          <span>Recovery Success by Channel</span>
        </h3>
        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          Omnichannel Evidence
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Granular conversion rate, revenue captured, and speed across delivery rails
      </p>

      <div className="space-y-3">
        {channelData.map((ch, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {getChannelIcon(ch.channel)}
                <span className="font-bold text-xs text-slate-900">{ch.channelName}</span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {ch.channelRecoveryRatePct}% Win Rate
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-[11px] font-mono mt-2 pt-2 border-t border-slate-200/60 text-slate-600">
              <div>
                <div className="text-[10px] text-slate-400">Attempted</div>
                <div className="font-bold text-slate-800">{ch.attemptedCases} cases</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Recovered</div>
                <div className="font-bold text-emerald-700">₹{ch.revenueRecoveredINR.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Avg Time</div>
                <div className="font-bold text-slate-800">{ch.avgRecoveryTimeSec}s</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Net ROI</div>
                <div className="font-bold text-indigo-700">{ch.roiMultiplier}x</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
