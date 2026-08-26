/**
 * Color utilities for consistent theming across the app
 */

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

/**
 * Get the color classes for a case status
 */
export const getStatusColors = (status: CaseStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} => {
  const colors: Record<CaseStatus, { bg: string; text: string; border: string; dot: string }> = {
    DETECTED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
    PENDING: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
    NEGOTIATING: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    WAITING_CUSTOMER: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    EXECUTING: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
    PENDING_APPROVAL: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
    RECOVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    DISMISSED: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    ESCALATED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' }
  };
  
  return colors[status] || colors.DETECTED;
};

/**
 * Get color for a risk tier
 */
export const getRiskTierColor = (tier: string): { bg: string; text: string } => {
  const colors: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: 'bg-red-100', text: 'text-red-700' },
    HIGH: { bg: 'bg-orange-100', text: 'text-orange-700' },
    MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-700' },
    LOW: { bg: 'bg-emerald-100', text: 'text-emerald-700' }
  };
  
  return colors[tier] || colors.MEDIUM;
};

/**
 * Get color for a channel type
 */
export const getChannelColor = (channel: string): { bg: string; text: string; icon: string } => {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    WHATSAPP: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600' },
    ACP_A2A: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'text-indigo-600' },
    SMS: { bg: 'bg-sky-100', text: 'text-sky-700', icon: 'text-sky-600' },
    EMAIL: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-600' },
    VOICE: { bg: 'bg-violet-100', text: 'text-violet-700', icon: 'text-violet-600' }
  };
  
  return colors[channel] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: 'text-slate-600' };
};

/**
 * Get color for a progress percentage
 */
export const getProgressColor = (percentage: number): string => {
  if (percentage >= 80) return 'emerald';
  if (percentage >= 60) return 'indigo';
  if (percentage >= 40) return 'amber';
  return 'red';
};

export default {
  getStatusColors,
  getRiskTierColor,
  getChannelColor,
  getProgressColor
};
