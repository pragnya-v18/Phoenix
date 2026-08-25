import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  ChevronDown, 
  Radio, 
  Bell, 
  Calendar, 
  SlidersHorizontal,
  RefreshCw,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  ShoppingCart,
  FileText
} from 'lucide-react';
import { ExecutiveKPIs, BankHealthMetric } from '../types';

interface TopBarProps {
  activeTab: string;
  kpis: ExecutiveKPIs | null;
  bankHealth: BankHealthMetric[];
  onSimulate: (scenario: 'UPI_LIMIT' | 'SBI_DOWNTIME' | 'HIGH_VALUE_B2B' | 'SUBSCRIPTION_HALT') => void;
  onSimulateBatch?: (batchSize: number) => void;
  onSimulateCheckout?: (scenario: 'HIGH_VALUE_CART' | 'MOBILE_FRICTION' | 'OTP_TIMEOUT' | 'PRICE_SENSITIVITY') => void;
  onSimulateCheckoutBatch?: (batchSize: number) => void;
  onSimulateInvoice?: (scenario: 'APPROVAL_DELAY' | 'PROCUREMENT_DELAY' | 'CASHFLOW_ISSUE' | 'ENTERPRISE_OVERDUE') => void;
  onSimulateInvoiceBatch?: (batchSize: number) => void;
  isSimulating: boolean;
  timeRange: string;
  setTimeRange: (t: string) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  kpis,
  bankHealth,
  onSimulate,
  onSimulateBatch,
  onSimulateCheckout,
  onSimulateCheckoutBatch,
  onSimulateInvoice,
  onSimulateInvoiceBatch,
  isSimulating,
  timeRange,
  setTimeRange,
  searchTerm,
  setSearchTerm
}) => {
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const degradedBanks = bankHealth.filter(b => b.status !== 'HEALTHY');

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Executive Command Center', subtitle: 'Autonomous Revenue Recovery Engine & Live Financial Forensics' },
    cases: { title: 'Recovery Triage & Case Ledger', subtitle: 'Real-time transaction failure interception, AI diagnosis, and human review' },
    agents: { title: 'LangGraph Multi-Agent Mesh', subtitle: 'Autonomous 7-agent DAG execution pipeline with latency and reasoning traces' },
    acp: { title: 'ACP 2.0 Agent-to-Agent Sandbox', subtitle: 'Autonomous inter-agent commerce negotiation protocol and wallet checkout' },
    'bank-radar': { title: 'Indian Banking Switch Radar', subtitle: 'Real-time NPCI UPI and bank switch uptime matrix preventing blind retries' },
    audits: { title: 'Immutable Compliance & Audit Trail', subtitle: 'Cryptographically signed agent decision logs and explainability trail' }
  };

  const currentTabInfo = tabTitles[activeTab] || { title: 'Command Center', subtitle: 'Razorpay AI Revenue Recovery' };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: View Title & Status Badge */}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {currentTabInfo.title}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentTabInfo.subtitle}
          </p>
        </div>

        {/* Right: Global Search + Time Filter + Simulator + Alert Bell */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Global Search Bar (⌘K style) */}
          <div className="relative min-w-[220px] sm:min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Case, Customer, Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </span>
          </div>

          {/* Timeframe Filter Pill */}
          <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
            {['Live', '24H', '7D', '30D'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeRange === t 
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Simulate Webhook Trigger Dropdown */}
          <div className="relative">
            <button
              disabled={isSimulating}
              onClick={() => setShowSimMenu(!showSimMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSimulating ? 'Simulating...' : 'Simulate Failure'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-200" />
            </button>

            {showSimMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSimMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    Simulate Live Razorpay Failure Webhooks
                  </div>
                  
                  <button
                    onClick={() => {
                      onSimulate('UPI_LIMIT');
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">1. UPI Daily Limit Exceeded</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">₹5,499</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Autonomous Card switch + 5% incentive via ACP</span>
                  </button>

                  <button
                    onClick={() => {
                      onSimulate('SBI_DOWNTIME');
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">2. Issuer Outage (SBI NetBanking)</span>
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">₹3,200</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Bank radar detection + optimal backoff retry delay</span>
                  </button>

                  <button
                    onClick={() => {
                      onSimulate('HIGH_VALUE_B2B');
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">3. High-Value B2B SaaS Deal</span>
                      <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">₹48,500</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Circuit breaker trigger + Human-in-the-Loop review</span>
                  </button>

                  <button
                    onClick={() => {
                      onSimulate('SUBSCRIPTION_HALT');
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">4. e-Mandate Expired (Recurring)</span>
                      <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">₹1,499</span>
                    </div>
                    <span className="text-[11px] text-slate-500">1-click WhatsApp interactive token renewal</span>
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button
                    onClick={() => {
                      if (onSimulateBatch) onSimulateBatch(5);
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-xl text-xs transition-colors flex flex-col gap-0.5 border border-indigo-200/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                        5. Run Batch Ingestion (5 Payments)
                      </span>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                        ₹1,03,496
                      </span>
                    </div>
                    <span className="text-[11px] text-indigo-700 font-medium">
                      Simulate multi-channel failure stream & compute live recovery evidence
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShoppingCart className="w-3 h-3 text-emerald-500" />
                    Checkout Abandonment Recovery
                  </div>

                  <button
                    onClick={() => {
                      if (onSimulateCheckout) onSimulateCheckout('HIGH_VALUE_CART');
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">6. High-Value Enterprise Cart</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">₹34,999</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Platinum CLV, 3-item cart, abandoned at Payment Auth</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onSimulateCheckout) onSimulateCheckout('OTP_TIMEOUT');
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">7. OTP Timeout (Card 2FA)</span>
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">₹12,499</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Session expired at OTP entry, transient — 1-click retry</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onSimulateCheckoutBatch) onSimulateCheckoutBatch(4);
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl text-xs transition-colors flex flex-col gap-0.5 border border-emerald-200/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        8. Run Checkout Batch (4 Abandonments)
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                        ₹59,996
                      </span>
                    </div>
                      <span className="text-[11px] text-emerald-700 font-medium">
                      Multi-stage checkout abandonment stream across devices
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-orange-500" />
                    B2B Receivables Recovery
                  </div>

                  <button
                    onClick={() => {
                      if (onSimulateInvoice) onSimulateInvoice('APPROVAL_DELAY');
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">9. 15-Day Overdue (Approval Delay)</span>
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">₹87,500</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Gold CLV, 85% on-time history, procurement approval stuck</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onSimulateInvoice) onSimulateInvoice('CASHFLOW_ISSUE');
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">10. 72-Day Overdue (Cash Flow Issue)</span>
                      <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">₹3,20,000</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Platinum CLV, 45% on-time, manufacturing sector cash crunch</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onSimulateInvoiceBatch) onSimulateInvoiceBatch(4);
                      setShowSimMenu(false);
                    }}
                    className="w-full text-left p-2.5 bg-orange-50/70 hover:bg-orange-100/70 rounded-xl text-xs transition-colors flex flex-col gap-0.5 border border-orange-200/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-950 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
                        11. Run Receivables Batch (4 Invoices)
                      </span>
                      <span className="text-[10px] font-mono font-bold text-orange-700 bg-white px-1.5 py-0.2 rounded border border-orange-200">
                        ₹11,32,500
                      </span>
                    </div>
                    <span className="text-[11px] text-orange-700 font-medium">
                      Multi-DPD overdue invoice stream across B2B accounts
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Alert Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors relative"
              title="Active Alerts"
            >
              <Bell className="w-4 h-4" />
              {degradedBanks.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>

            {showAlerts && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAlerts(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">System Telemetry Alerts</span>
                    <span className="text-[10px] text-slate-500 font-mono">Live</span>
                  </div>
                  <div className="space-y-2 mt-2">
                    {degradedBanks.length > 0 ? (
                      degradedBanks.map(b => (
                        <div key={b.bankCode} className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                          <div className="font-bold text-amber-900 flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-amber-600" />
                            <span>{b.bankCode} Switch Degradation ({b.rollingSuccessRatePct.toFixed(0)}%)</span>
                          </div>
                          <div className="text-[11px] text-amber-700 mt-0.5">
                            Autonomous retry delays activated to avoid customer drop-off.
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-500">
                        All Indian banking switch rails (HDFC, SBI, ICICI, Axis) operating nominally.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
