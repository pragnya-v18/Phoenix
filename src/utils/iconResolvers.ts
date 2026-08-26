import React from 'react';
import { 
  MessageSquare, 
  Zap, 
  Smartphone, 
  Mail, 
  CreditCard,
  Phone,
  Send,
  Bot,
  Globe,
  Radio
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/**
 * Get the icon component for a channel type
 */
export const getChannelIcon = (channel: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    WHATSAPP: MessageSquare,
    ACP_A2A: Zap,
    SMS: Smartphone,
    EMAIL: Mail,
    VOICE: Phone,
    UPI: CreditCard,
    PAYMENT_LINK: Send,
    BOT: Bot,
    WEB: Globe,
    RADIO: Radio
  };
  
  return iconMap[channel] || CreditCard;
};

/**
 * Get the icon element for a channel type with color
 */
export const getChannelIconElement = (channel: string): React.ReactNode => {
  const Icon = getChannelIcon(channel);
  const colorClass = getChannelIconColor(channel);
  return React.createElement(Icon, { className: `w-4 h-4 ${colorClass}` });
};

/**
 * Get the color class for a channel icon
 */
export const getChannelIconColor = (channel: string): string => {
  const colorMap: Record<string, string> = {
    WHATSAPP: 'text-emerald-600',
    ACP_A2A: 'text-indigo-600',
    SMS: 'text-sky-600',
    EMAIL: 'text-amber-600',
    VOICE: 'text-violet-600',
    UPI: 'text-blue-600',
    PAYMENT_LINK: 'text-pink-600',
    BOT: 'text-indigo-600',
    WEB: 'text-slate-600',
    RADIO: 'text-cyan-600'
  };
  
  return colorMap[channel] || 'text-slate-600';
};

/**
 * Get the icon for a root cause category
 */
export const getRootCauseIcon = (rootCause: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    LIMIT_EXCEEDED: Zap,
    ISSUER_DOWNTIME: Radio,
    MANDATE_EXPIRED: CreditCard,
    CUSTOMER_FRICTION: MessageSquare,
    INSUFFICIENT_FUNDS: CreditCard,
    TECHNICAL_FAILURE: Zap,
    NETWORK_ERROR: Globe,
    OTHER: MessageSquare
  };
  
  return iconMap[rootCause] || MessageSquare;
};

/**
 * Get the icon for a checkout stage
 */
export const getCheckoutStageIcon = (stage: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    CART: MessageSquare,
    SHIPPING: Send,
    PAYMENT: CreditCard,
    CONFIRMATION: Zap
  };
  
  return iconMap[stage] || MessageSquare;
};

export default {
  getChannelIcon,
  getChannelIconElement,
  getChannelIconColor,
  getRootCauseIcon,
  getCheckoutStageIcon
};
