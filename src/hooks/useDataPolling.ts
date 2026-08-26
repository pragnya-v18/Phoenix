/**
 * RecoverFlow AI - Data Polling Hook
 * Manages initial data fetch, interval-based polling, and SSE live stream.
 */

import { useState, useEffect, useCallback } from 'react';
import { RecoveryCase, ExecutiveKPIs, BankHealthMetric, AuditLogEntry } from '../types';
import { testFirestoreConnection } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface UseDataPollingReturn {
  cases: RecoveryCase[];
  setCases: React.Dispatch<React.SetStateAction<RecoveryCase[]>>;
  kpis: ExecutiveKPIs | null;
  setKpis: React.Dispatch<React.SetStateAction<ExecutiveKPIs | null>>;
  bankHealth: BankHealthMetric[];
  setBankHealth: React.Dispatch<React.SetStateAction<BankHealthMetric[]>>;
  audits: AuditLogEntry[];
  setAudits: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  isLoading: boolean;
  currentUser: FirebaseUser | null;
  firebaseConnected: boolean;
  refreshData: () => Promise<void>;
}

export function useDataPolling(): UseDataPollingReturn {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null);
  const [bankHealth, setBankHealth] = useState<BankHealthMetric[]>([]);
  const [audits, setAudits] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);

  const refreshData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetch('/api/cases').then(r => r.ok ? r.json() : null),
        fetch('/api/analytics/kpis').then(r => r.ok ? r.json() : null),
        fetch('/api/bank-health').then(r => r.ok ? r.json() : null),
        fetch('/api/audit-trail').then(r => r.ok ? r.json() : null)
      ]);

      const [casesRes, kpisRes, bankRes, auditsRes] = results;

      if (casesRes.status === 'fulfilled' && casesRes.value) {
        const casesData = casesRes.value;
        setCases(Array.isArray(casesData) ? casesData : (casesData.cases || []));
      }

      if (kpisRes.status === 'fulfilled' && kpisRes.value) {
        setKpis(kpisRes.value);
      }

      if (bankRes.status === 'fulfilled' && bankRes.value) {
        const bankData = bankRes.value;
        setBankHealth(Array.isArray(bankData) ? bankData : []);
      }

      if (auditsRes.status === 'fulfilled' && auditsRes.value) {
        const auditsData = auditsRes.value;
        setAudits(Array.isArray(auditsData) ? auditsData : []);
      }

      setIsLoading(false);
    } catch (err) {
      console.warn('RecoverFlow telemetry sync notice (retrying automatically):', err);
      setIsLoading(false);
    }
  }, []);

  // Auth listener & Firebase connection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    testFirestoreConnection().then((ok) => {
      setFirebaseConnected(ok);
    });

    return () => unsubscribe();
  }, []);

  // Fetch all initial data + set up polling + SSE
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 4000);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'case_created' || data.event === 'case_updated' || data.event === 'case_deleted') {
            refreshData();
          }
        } catch {
          // ignore parse errors
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch {
      // SSE fallback to interval polling
    }

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [refreshData]);

  return {
    cases,
    setCases,
    kpis,
    setKpis,
    bankHealth,
    setBankHealth,
    audits,
    setAudits,
    isLoading,
    currentUser,
    firebaseConnected,
    refreshData
  };
}
