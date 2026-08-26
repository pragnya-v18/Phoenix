/**
 * ACP (Agent Communication Protocol) types for RecoverFlow AI
 */

import { PaymentMethod } from './case';

export interface WhatsAppButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface WhatsAppInteractivePayload {
  messaging_product?: 'whatsapp';
  recipient_type?: 'individual';
  to?: string;
  type?: 'interactive' | 'button' | 'cta_url';
  interactive?: {
    type: 'button' | 'cta_url' | 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons?: WhatsAppButton[];
      name?: string;
      parameters?: {
        display_text: string;
        url: string;
      };
    };
  };
  header?: {
    type: 'text';
    text: string;
  };
  body?: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action?: {
    buttons?: WhatsAppButton[];
    name?: string;
    parameters?: {
      display_text: string;
      url: string;
    };
  };
}

export interface ACPMessage {
  id: string;
  sender: 'MerchantRecoveryAgent' | 'CustomerWalletAgent';
  receiver: 'CustomerWalletAgent' | 'MerchantRecoveryAgent';
  intent: 'HANDSHAKE' | 'PROPOSE_OFFER' | 'COUNTER_OFFER' | 'ACCEPT_AND_COMMIT' | 'REJECT';
  payload: {
    discountPct?: number;
    netAmount?: number;
    selectedMethod?: PaymentMethod;
    cardLast4?: string;
    consentToken?: string;
    message?: string;
    expiresInMinutes?: number;
  };
  timestamp: string;
}

export interface ACPSession {
  sessionId: string;
  status: 'PROPOSED' | 'COUNTER_OFFER' | 'ACCEPTED' | 'REJECTED';
  protocolVersion: string;
  dialogue: ACPMessage[];
}

export interface ComplianceEvaluation {
  approved: boolean;
  rulesPassed: string[];
  violations: string[];
  requiresHumanApproval: boolean;
  evaluatedAt: string;
  reasoningSummary?: string;
  confidenceScore?: number;
}
