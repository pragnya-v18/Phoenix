/**
 * RecoverFlow AI - Simulation API Hook
 * Encapsulates all simulation-related fetch calls and state management.
 */

import { useState, useCallback } from 'react';
import { RecoveryCase, ChannelType } from '../types';

export interface UseSimulationApiReturn {
  isSimulating: boolean;
  isRunningAgent: boolean;
  simulateScenario: (scenario: 'UPI_LIMIT' | 'SBI_DOWNTIME' | 'HIGH_VALUE_B2B' | 'SUBSCRIPTION_HALT') => Promise<void>;
  simulateBatch: (batchSize?: number) => Promise<void>;
  simulateCheckout: (scenario: 'HIGH_VALUE_CART' | 'MOBILE_FRICTION' | 'OTP_TIMEOUT' | 'PRICE_SENSITIVITY') => Promise<void>;
  simulateCheckoutBatch: (batchSize?: number) => Promise<void>;
  simulateInvoice: (scenario: 'APPROVAL_DELAY' | 'PROCUREMENT_DELAY' | 'CASHFLOW_ISSUE' | 'ENTERPRISE_OVERDUE') => Promise<void>;
  simulateInvoiceBatch: (batchSize?: number) => Promise<void>;
  simulateVoiceCall: (
    eventType: 'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE',
    language?: 'ENGLISH' | 'HINGLISH' | 'HINDI',
    tone?: 'PROFESSIONAL' | 'EMPATHETIC' | 'URGENT' | 'FRIENDLY' | 'CORPORATE'
  ) => Promise<void>;
  simulateVoiceBatch: (batchSize?: number) => Promise<void>;
  simulateBankStatus: (bankCode: string, successRate: number, status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE') => Promise<void>;
  runAgent: (caseId: string) => Promise<void>;
  sendNegotiation: (caseId: string, intent: string, payload: any) => Promise<void>;
  humanAction: (caseId: string, action: 'APPROVE' | 'DISMISS', discountPct?: number, notes?: string, overrideChannel?: ChannelType) => Promise<void>;
}

export function useSimulationApi(
  refreshData: () => Promise<void>,
  setCases: React.Dispatch<React.SetStateAction<RecoveryCase[]>>,
  setKpis: React.Dispatch<React.SetStateAction<any>>,
  setBankHealth: React.Dispatch<React.SetStateAction<any>>,
  setAudits: React.Dispatch<React.SetStateAction<any>>,
  setActiveTab: (tab: string) => void,
  setSelectedCase: (c: RecoveryCase | null) => void,
  cases: RecoveryCase[]
): UseSimulationApiReturn {
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRunningAgent, setIsRunningAgent] = useState(false);

  const simulateScenario = useCallback(async (scenario: 'UPI_LIMIT' | 'SBI_DOWNTIME' | 'HIGH_VALUE_B2B' | 'SUBSCRIPTION_HALT') => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/incoming-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      const data = await res.json();
      if (data.case) {
        setSelectedCase(data.case);
        setActiveTab('cases');
      }
      await refreshData();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [refreshData, setActiveTab, setSelectedCase]);

  const simulateBatch = useCallback(async (batchSize: number = 5) => {
    setIsSimulating(true);
    try {
      await fetch('/api/simulate/batch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      await refreshData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Batch simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [refreshData, setActiveTab]);

  const simulateCheckout = useCallback(async (scenario: 'HIGH_VALUE_CART' | 'MOBILE_FRICTION' | 'OTP_TIMEOUT' | 'PRICE_SENSITIVITY') => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/checkout-abandonment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      const data = await res.json();
      if (data.case) {
        setSelectedCase(data.case);
        setActiveTab('cases');
      }
      await refreshData();
    } catch (err) {
      console.error('Checkout simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [refreshData, setActiveTab, setSelectedCase]);

  const simulateCheckoutBatch = useCallback(async (batchSize: number = 4) => {
    setIsSimulating(true);
    try {
      await fetch('/api/simulate/checkout-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      await refreshData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Checkout batch simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [refreshData, setActiveTab]);

  const simulateInvoice = useCallback(async (scenario: 'APPROVAL_DELAY' | 'PROCUREMENT_DELAY' | 'CASHFLOW_ISSUE' | 'ENTERPRISE_OVERDUE') => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/overdue-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      const data = await res.json();
      if (data.case) {
        setSelectedCase(data.case);
        setActiveTab('cases');
      }
      await refreshData();
    } catch (err) {
      console.error('Invoice simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [refreshData, setActiveTab, setSelectedCase]);

  const simulateInvoiceBatch = useCallback(async (batchSize: number = 4) => {
    setIsSimulating(true);
    try {
      await fetch('/api/simulate/receivables-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      await refreshData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Receivables batch simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [refreshData, setActiveTab]);

  const simulateVoiceCall = useCallback(async (
    eventType: 'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE',
    language: 'ENGLISH' | 'HINGLISH' | 'HINDI' = 'HINGLISH',
    tone: 'PROFESSIONAL' | 'EMPATHETIC' | 'URGENT' | 'FRIENDLY' | 'CORPORATE' = 'FRIENDLY'
  ) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/voice-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, language, tone })
      });
      const data = await res.json();
      if (data.case) {
        setSelectedCase(data.case);
        setActiveTab('cases');
      }
      await refreshData();
    } catch (err) {
      console.error('Voice call simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [refreshData, setActiveTab, setSelectedCase]);

  const simulateVoiceBatch = useCallback(async (batchSize: number = 4) => {
    setIsSimulating(true);
    try {
      await fetch('/api/simulate/voice-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      await refreshData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Voice batch simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [refreshData, setActiveTab]);

  const simulateBankStatus = useCallback(async (bankCode: string, successRate: number, status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE') => {
    try {
      await fetch('/api/bank-health/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode, successRate, status })
      });
      await refreshData();
    } catch (err) {
      console.error('Error updating bank status:', err);
    }
  }, [refreshData]);

  const runAgent = useCallback(async (caseId: string) => {
    setIsRunningAgent(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/run-recovery`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.case) {
        setSelectedCase(data.case);
      }
      await refreshData();
    } catch (err) {
      console.error('Error running agent pipeline:', err);
    } finally {
      setIsRunningAgent(false);
    }
  }, [refreshData, setSelectedCase]);

  const sendNegotiation = useCallback(async (caseId: string, intent: string, payload: any) => {
    try {
      await fetch(`/api/acp/negotiate/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, payload })
      });
      await refreshData();
      const updated = cases.find(c => c.caseId === caseId);
      if (updated) setSelectedCase(updated);
    } catch (err) {
      console.error('Error transmitting ACP message:', err);
    }
  }, [refreshData, cases, setSelectedCase]);

  const humanAction = useCallback(async (caseId: string, action: 'APPROVE' | 'DISMISS', discountPct?: number, notes?: string, overrideChannel?: ChannelType) => {
    try {
      await fetch(`/api/cases/${caseId}/human-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, overrideDiscountPct: discountPct, notes, overrideChannel })
      });
      await refreshData();
    } catch (err) {
      console.error('Error with human decision:', err);
    }
  }, [refreshData]);

  return {
    isSimulating,
    simulateScenario,
    simulateBatch,
    simulateCheckout,
    simulateCheckoutBatch,
    simulateInvoice,
    simulateInvoiceBatch,
    simulateVoiceCall,
    simulateVoiceBatch,
    simulateBankStatus,
    runAgent,
    sendNegotiation,
    humanAction,
    isRunningAgent
  };
}
