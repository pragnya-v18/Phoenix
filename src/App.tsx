import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { RecoveryCasesView } from './components/RecoveryCasesView';
import { AgentMonitorView } from './components/AgentMonitorView';
import { AcpSandboxView } from './components/AcpSandboxView';
import { BankHealthRadar } from './components/BankHealthRadar';
import { AuditTrailView } from './components/AuditTrailView';
import { CaseDetailModal } from './components/CaseDetailModal';
import { RecoveryCase, ExecutiveKPIs, BankHealthMetric, AuditLogEntry } from './types';
import { auth, testFirestoreConnection } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null);
  const [bankHealth, setBankHealth] = useState<BankHealthMetric[]>([]);
  const [audits, setAudits] = useState<AuditLogEntry[]>([]);
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isRunningAgent, setIsRunningAgent] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<string>('24H');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Auth listener & Connection validator
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    testFirestoreConnection().then((ok) => {
      setFirebaseConnected(ok);
    });

    return () => unsubscribe();
  }, []);

  // Fetch all initial data with resilient individual error handling
  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // 4-second live telemetry refresh

    // Optional SSE live stream connection for real-time reactivity
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'case_created' || data.event === 'case_updated' || data.event === 'case_deleted') {
            fetchData();
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
  }, []);

  // Simulate failure scenario
  const handleSimulateScenario = async (scenario: 'UPI_LIMIT' | 'SBI_DOWNTIME' | 'HIGH_VALUE_B2B' | 'SUBSCRIPTION_HALT') => {
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
      await fetchData();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Simulate a live multi-transaction batch stream for judges
  const handleSimulateBatch = async (batchSize: number = 5) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/batch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      const data = await res.json();
      await fetchData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Batch simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run multi-agent pipeline on a specific case
  const handleRunAgent = async (caseId: string) => {
    setIsRunningAgent(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/run-recovery`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.case) {
        setSelectedCase(data.case);
      }
      await fetchData();
    } catch (err) {
      console.error('Error running agent pipeline:', err);
    } finally {
      setIsRunningAgent(false);
    }
  };

  // Transmit ACP negotiation intent
  const handleSendNegotiation = async (caseId: string, intent: string, payload: any) => {
    try {
      await fetch(`/api/acp/negotiate/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, payload })
      });
      await fetchData();
      const updated = cases.find(c => c.caseId === caseId);
      if (updated) setSelectedCase(updated);
    } catch (err) {
      console.error('Error transmitting ACP message:', err);
    }
  };

  // Simulate bank switch health
  const handleSimulateBankStatus = async (bankCode: string, successRate: number, status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE') => {
    try {
      await fetch('/api/bank-health/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode, successRate, status })
      });
      await fetchData();
    } catch (err) {
      console.error('Error updating bank status:', err);
    }
  };

  // Human in the Loop approval
  const handleHumanAction = async (caseId: string, action: 'APPROVE' | 'DISMISS', discountPct?: number, notes?: string) => {
    try {
      await fetch(`/api/cases/${caseId}/human-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, overrideDiscountPct: discountPct, notes })
      });
      await fetchData();
    } catch (err) {
      console.error('Error with human decision:', err);
    }
  };

  // Simulate checkout abandonment
  const handleSimulateCheckout = async (scenario: 'HIGH_VALUE_CART' | 'MOBILE_FRICTION' | 'OTP_TIMEOUT' | 'PRICE_SENSITIVITY') => {
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
      await fetchData();
    } catch (err) {
      console.error('Checkout simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Simulate batch of checkout abandonments
  const handleSimulateCheckoutBatch = async (batchSize: number = 4) => {
    setIsSimulating(true);
    try {
      await fetch('/api/simulate/checkout-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      await fetchData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Checkout batch simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Simulate overdue invoice (B2B Receivables)
  const handleSimulateInvoice = async (scenario: 'APPROVAL_DELAY' | 'PROCUREMENT_DELAY' | 'CASHFLOW_ISSUE' | 'ENTERPRISE_OVERDUE') => {
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
      await fetchData();
    } catch (err) {
      console.error('Invoice simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Simulate batch of overdue invoices
  const handleSimulateInvoiceBatch = async (batchSize: number = 4) => {
    setIsSimulating(true);
    try {
      await fetch('/api/simulate/receivables-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      await fetchData();
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Receivables batch simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading && cases.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl max-w-sm">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="font-bold text-sm text-slate-200">Connecting to RecoverFlow Agent Mesh...</div>
          <div className="text-xs text-slate-400">Initializing Razorpay Webhook Ingestion & Bank Telemetry Radar</div>
        </div>
      </div>
    );
  }

  // Filter cases if search is applied
  const displayedCases = cases.filter(c => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      c.caseId.toLowerCase().includes(s) ||
      c.customer.name.toLowerCase().includes(s) ||
      c.customer.phone.includes(s) ||
      (c.sourceEvent.paymentId && c.sourceEvent.paymentId.toLowerCase().includes(s))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex selection:bg-indigo-500 selection:text-white">
      {/* 1. Sleek Modern Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        kpis={kpis}
        bankHealth={bankHealth}
        currentUser={currentUser}
        firebaseConnected={firebaseConnected}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* 2. Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        sidebarCollapsed ? 'pl-20' : 'pl-64'
      }`}>
        {/* Sticky Top Header Bar */}
        <TopBar
          activeTab={activeTab}
          kpis={kpis}
          bankHealth={bankHealth}
          onSimulate={handleSimulateScenario}
          onSimulateBatch={handleSimulateBatch}
          onSimulateCheckout={handleSimulateCheckout}
          onSimulateCheckoutBatch={handleSimulateCheckoutBatch}
          onSimulateInvoice={handleSimulateInvoice}
          onSimulateInvoiceBatch={handleSimulateInvoiceBatch}
          isSimulating={isSimulating}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {/* View Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <ExecutiveDashboard
              kpis={kpis}
              cases={displayedCases}
              bankHealth={bankHealth}
              onSelectCase={(c) => setSelectedCase(c)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onRunAgent={handleRunAgent}
              isRunningAgent={isRunningAgent}
              timeRange={timeRange}
            />
          )}

          {activeTab === 'cases' && (
            <RecoveryCasesView
              cases={displayedCases}
              onSelectCase={(c) => setSelectedCase(c)}
              onRunAgent={handleRunAgent}
              isRunningAgent={isRunningAgent}
            />
          )}

          {activeTab === 'agents' && (
            <AgentMonitorView
              cases={displayedCases}
              selectedCase={selectedCase}
              onSelectCase={(c) => setSelectedCase(c)}
            />
          )}

          {activeTab === 'acp' && (
            <AcpSandboxView
              cases={displayedCases}
              selectedCase={selectedCase}
              onSelectCase={(c) => setSelectedCase(c)}
              onSendNegotiation={handleSendNegotiation}
              isSending={false}
            />
          )}

          {activeTab === 'bank-radar' && (
            <BankHealthRadar
              bankHealth={bankHealth}
              onSimulateBankStatus={handleSimulateBankStatus}
            />
          )}

          {activeTab === 'audits' && (
            <AuditTrailView audits={audits} />
          )}
        </main>
      </div>

      {/* Detail & Human In The Loop Modal */}
      {selectedCase && (
        <CaseDetailModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRunAgent={handleRunAgent}
          onHumanAction={handleHumanAction}
          isRunningAgent={isRunningAgent}
        />
      )}
    </div>
  );
}
export default App;
