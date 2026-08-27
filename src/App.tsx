import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { RecoveryCasesView } from './components/RecoveryCasesView';
import { AgentMonitorView } from './components/AgentMonitorView';
import { AcpSandboxView } from './components/AcpSandboxView';
import { BankHealthRadar } from './components/BankHealthRadar';
import { AuditTrailView } from './components/AuditTrailView';
import { CaseDetailModal } from './components/modals/CaseDetailModal';
import { DemoWalkthrough } from './components/DemoWalkthrough';
import { RecoveryCase } from './types';
import { useDataPolling } from './hooks/useDataPolling';
import { useSimulationApi } from './hooks/useSimulationApi';
import { useDemoWalkthrough } from './hooks/useDemoWalkthrough';
import { ShieldCheck } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<string>('24H');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const dataPolling = useDataPolling();
  const simApi = useSimulationApi(
    dataPolling.refreshData,
    dataPolling.setCases,
    dataPolling.setKpis,
    dataPolling.setBankHealth,
    dataPolling.setAudits,
    setActiveTab,
    setSelectedCase,
    dataPolling.cases
  );

  const demo = useDemoWalkthrough(simApi.simulateScenario, setActiveTab);

  useEffect(() => {
    const handler = () => demo.startDemo();
    window.addEventListener('recoverflow:start-demo', handler);
    return () => window.removeEventListener('recoverflow:start-demo', handler);
  }, [demo.startDemo]);

  if (dataPolling.isLoading && dataPolling.cases.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4 p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm text-slate-200">RecoverFlow</div>
            <div className="text-[11px] text-slate-400">AI Recovery Operating System</div>
          </div>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-[11px] text-slate-500">Initializing agent mesh & bank telemetry...</div>
        </div>
      </div>
    );
  }

  // Filter cases if search is applied
  const displayedCases = dataPolling.cases.filter(c => {
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
        kpis={dataPolling.kpis}
        bankHealth={dataPolling.bankHealth}
        currentUser={dataPolling.currentUser}
        firebaseConnected={dataPolling.firebaseConnected}
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
          kpis={dataPolling.kpis}
          bankHealth={dataPolling.bankHealth}
          onSimulate={simApi.simulateScenario}
          onSimulateBatch={simApi.simulateBatch}
          onSimulateCheckout={simApi.simulateCheckout}
          onSimulateCheckoutBatch={simApi.simulateCheckoutBatch}
          onSimulateInvoice={simApi.simulateInvoice}
          onSimulateInvoiceBatch={simApi.simulateInvoiceBatch}
          onSimulateVoiceCall={simApi.simulateVoiceCall}
          onSimulateVoiceBatch={simApi.simulateVoiceBatch}
          isSimulating={simApi.isSimulating}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {/* View Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <ExecutiveDashboard
                  kpis={dataPolling.kpis}
                  cases={displayedCases}
                  bankHealth={dataPolling.bankHealth}
                  onSelectCase={(c) => setSelectedCase(c)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onRunAgent={simApi.runAgent}
                  isRunningAgent={simApi.isRunningAgent}
                  timeRange={timeRange}
                />
              </motion.div>
            )}

            {activeTab === 'cases' && (
              <motion.div key="cases" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <RecoveryCasesView
                  cases={displayedCases}
                  onSelectCase={(c) => setSelectedCase(c)}
                  onRunAgent={simApi.runAgent}
                  isRunningAgent={simApi.isRunningAgent}
                />
              </motion.div>
            )}

            {activeTab === 'agents' && (
              <motion.div key="agents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <AgentMonitorView
                  cases={displayedCases}
                  selectedCase={selectedCase}
                  onSelectCase={(c) => setSelectedCase(c)}
                />
              </motion.div>
            )}

            {activeTab === 'acp' && (
              <motion.div key="acp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <AcpSandboxView
                  cases={displayedCases}
                  selectedCase={selectedCase}
                  onSelectCase={(c) => setSelectedCase(c)}
                  onSendNegotiation={simApi.sendNegotiation}
                  isSending={false}
                />
              </motion.div>
            )}

            {activeTab === 'bank-radar' && (
              <motion.div key="bank-radar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <BankHealthRadar
                  bankHealth={dataPolling.bankHealth}
                  onSimulateBankStatus={simApi.simulateBankStatus}
                />
              </motion.div>
            )}

            {activeTab === 'audits' && (
              <motion.div key="audits" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <AuditTrailView audits={dataPolling.audits} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Detail & Human In The Loop Modal */}
      {selectedCase && (
        <CaseDetailModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRunAgent={simApi.runAgent}
          onHumanAction={simApi.humanAction}
          isRunningAgent={simApi.isRunningAgent}
        />
      )}

      {/* Demo Walkthrough */}
      <DemoWalkthrough
        isRunning={demo.isRunning}
        currentStep={demo.currentStep}
        completedSteps={demo.completedSteps}
        steps={demo.steps}
        onStart={demo.startDemo}
        onCancel={demo.cancelDemo}
      />
    </div>
  );
}
export default App;
