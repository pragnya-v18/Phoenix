import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Lock, 
  Key, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Hash
} from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditTrailViewProps {
  audits: AuditLogEntry[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ audits }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = audits.filter(a => 
    a.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.rationale.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Immutable Audit Ledger & Compliance Trail</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically signed decision history proving zero black-box autonomy and full explainability
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by Case ID, Agent Name, Action, or Rationale..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Timestamp & Case</th>
                <th className="py-2.5 px-4">Agent Name</th>
                <th className="py-2.5 px-4">Action Taken</th>
                <th className="py-2.5 px-4">Rationale & Reasoning</th>
                <th className="py-2.5 px-4">Model & Latency</th>
                <th className="py-2.5 px-4 text-right">SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit records match the search filter.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-900 font-semibold">{log.caseId}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.agentName}</div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {log.action}
                      </span>
                    </td>

                    {/* Rationale */}
                    <td className="py-3 px-4 max-w-md">
                      <p className="text-slate-700 leading-relaxed line-clamp-2">
                        {log.rationale}
                      </p>
                    </td>

                    {/* Model */}
                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-medium text-[11px]">{log.model}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {log.latencyMs}ms • {log.tokensUsed} tokens
                      </div>
                    </td>

                    {/* Hash */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1 font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                        <Hash className="w-3 h-3 text-indigo-500" />
                        <span>{log.signatureHash.slice(0, 10)}...</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
