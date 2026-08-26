import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Zap, Phone, Mail, MessageSquare, Send, RefreshCw } from 'lucide-react';

type CaseStatus = 
  | 'DETECTED' 
  | 'PENDING' 
  | 'NEGOTIATING' 
  | 'WAITING_CUSTOMER' 
  | 'EXECUTING' 
  | 'PENDING_APPROVAL' 
  | 'RECOVERED' 
  | 'DISMISSED' 
  | 'FAILED' 
  | 'ESCALATED';

interface StatusBadgeProps {
  status: CaseStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<CaseStatus, { 
  bg: string; 
  text: string; 
  border: string; 
  icon?: React.ReactNode;
  animate?: boolean;
}> = {
  DETECTED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  PENDING: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  NEGOTIATING: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: <RefreshCw className="w-3 h-3 text-indigo-600" /> },
  WAITING_CUSTOMER: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', animate: true },
  EXECUTING: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: <Zap className="w-3 h-3 text-violet-600" /> },
  PENDING_APPROVAL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', animate: true, icon: <AlertCircle className="w-3 h-3 text-amber-600" /> },
  RECOVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" /> },
  DISMISSED: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  ESCALATED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  showIcon = true,
  size = 'sm'
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DETECTED;
  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-0.5 text-[11px]' 
    : 'px-3 py-1 text-xs';

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full font-semibold
      ${config.bg} ${config.text} ${config.border} border
      ${config.animate ? 'animate-pulse' : ''}
      ${sizeClasses}
    `}>
      {showIcon && config.icon}
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
};

export default StatusBadge;
