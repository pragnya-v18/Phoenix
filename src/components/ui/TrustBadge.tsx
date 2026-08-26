import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, Hash, Link2 } from 'lucide-react';

interface TrustBadgeProps {
  signatureHash: string;
  verified?: boolean;
  compact?: boolean;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ signatureHash, verified = true, compact = false }) => {
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border ${
        verified 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
          : 'bg-rose-50 text-rose-700 border-rose-200'
      }`}>
        {verified ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
        <span>{signatureHash.slice(0, 8)}…</span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
      verified 
        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' 
        : 'bg-rose-50/70 border-rose-200 text-rose-800'
    }`}>
      {verified ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      )}
      <div className="min-w-0">
        <div className="font-semibold text-[11px]">
          {verified ? 'Cryptographically Verified' : 'Signature Mismatch'}
        </div>
        <div className="font-mono text-[10px] opacity-70 truncate">
          SHA-256: {signatureHash.slice(0, 20)}…
        </div>
      </div>
    </div>
  );
};

interface AuditProofCardProps {
  signatureHash: string;
  caseId: string;
  agentName: string;
  action: string;
  timestamp: string;
  model: string;
  latencyMs: number;
  tokensUsed: number;
}

export const AuditProofCard: React.FC<AuditProofCardProps> = ({
  signatureHash,
  caseId,
  agentName,
  action,
  timestamp,
  model,
  latencyMs,
  tokensUsed
}) => {
  return (
    <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Immutable Audit Proof
        </div>
        <TrustBadge signatureHash={signatureHash} compact />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        <div>
          <span className="text-slate-400">Agent</span>
          <div className="font-semibold text-slate-800">{agentName}</div>
        </div>
        <div>
          <span className="text-slate-400">Action</span>
          <div className="font-mono font-semibold text-slate-800">{action}</div>
        </div>
        <div>
          <span className="text-slate-400">Model</span>
          <div className="font-semibold text-slate-800">{model}</div>
        </div>
        <div>
          <span className="text-slate-400">Latency</span>
          <div className="font-mono font-semibold text-slate-800">{latencyMs}ms · {tokensUsed} tok</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/60">
        <Hash className="w-3 h-3" />
        <span>SHA-256: {signatureHash}</span>
      </div>
    </div>
  );
};

interface ChainIntegrityIndicatorProps {
  hashes: string[];
  verified?: boolean;
}

export const ChainIntegrityIndicator: React.FC<ChainIntegrityIndicatorProps> = ({ hashes, verified = true }) => {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          Chain Integrity
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          verified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
        }`}>
          {verified ? 'Chain Valid' : 'Chain Broken'}
        </span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {hashes.map((hash, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-mono font-bold ${
                verified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="text-[8px] font-mono text-slate-400 mt-0.5 truncate max-w-[60px]">
                {hash.slice(0, 6)}
              </div>
            </div>
            {i < hashes.length - 1 && (
              <div className={`w-4 h-0.5 shrink-0 mt-[-12px] ${
                verified ? 'bg-emerald-300' : 'bg-rose-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
