import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Lock, 
  Clock, 
  Hash,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';
import { AuditLogEntry } from '../types';
import { AuditProofCard, TrustBadge } from './ui';

interface AuditTrailViewProps {
  audits: AuditLogEntry[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ audits }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = audits.filter(a => 
    a.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.rationale.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by case
  const grouped = filtered.reduce<Record<string, AuditLogEntry[]>>((acc, log) => {
    if (!acc[log.caseId]) acc[log.caseId] = [];
    acc[log.caseId].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Forensic Audit Timeline
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cryptographically signed decision trace · {audits.length} immutable records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            <Lock className="w-3 h-3" />
            SHA-256 signed
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Timeline grouped by case */}
      <div className="space-y-3">
        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
            No audit records match the search.
          </div>
        ) : (
          Object.entries(grouped).map(([caseId, logs]) => (
            <div key={caseId} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Case Header */}
              <div 
                className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedId(expandedId === caseId ? null : caseId)}
              >
                <div className="flex items-center gap-2">
                  {expandedId === caseId ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="font-mono font-bold text-xs text-slate-900">{caseId}</span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {logs.length} events
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(logs[logs.length - 1].timestamp).toLocaleTimeString()} — {new Date(logs[0].timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Timeline entries */}
              {expandedId === caseId && (
                <div className="p-4 space-y-2">
                  {logs.map((log, i) => (
                    <div key={log.id} className="flex items-start gap-3 relative">
                      {/* Timeline connector */}
                      {i < logs.length - 1 && (
                        <div className="absolute left-[11px] top-[28px] bottom-0 w-0.5 bg-slate-200" />
                      )}
                      
                      {/* Dot */}
                      <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 z-10">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/60">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-900">{log.agentName}</span>
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                {log.action}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono">{log.model}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{log.latencyMs}ms</span>
                              <span className="text-[10px] text-slate-400 font-mono">{log.tokensUsed} tok</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{log.rationale}</p>
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        {/* Cryptographic Proof */}
                        <AuditProofCard
                          signatureHash={log.signatureHash}
                          caseId={log.caseId}
                          agentName={log.agentName}
                          action={log.action}
                          timestamp={log.timestamp}
                          model={log.model}
                          latencyMs={log.latencyMs}
                          tokensUsed={log.tokensUsed}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
