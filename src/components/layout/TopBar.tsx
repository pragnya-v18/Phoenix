import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ChevronDown,
  Radio,
  Bell,
  ShoppingCart,
  FileText,
  Phone,
  Zap,
  LucideIcon
} from 'lucide-react';
import { ExecutiveKPIs, BankHealthMetric } from '../../types';

interface SimConfig {
  label: string;
  amount: string;
  amountColor: string;
  amountBg: string;
  description: string;
  action: () => void;
  isBatch?: boolean;
  batchBg?: string;
  batchHoverBg?: string;
  batchBorder?: string;
  batchTextColor?: string;
}

interface SimSection {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  items: SimConfig[];
}

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
  onSimulateVoiceCall?: (eventType: 'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE', language?: 'ENGLISH' | 'HINGLISH' | 'HINDI', tone?: 'PROFESSIONAL' | 'EMPATHETIC' | 'URGENT' | 'FRIENDLY' | 'CORPORATE') => void;
  onSimulateVoiceBatch?: (batchSize: number) => void;
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
  onSimulateVoiceCall,
  onSimulateVoiceBatch,
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

  const closeMenu = () => setShowSimMenu(false);

  const simSections: SimSection[] = [
    {
      title: 'Simulate Live Razorpay Failure Webhooks',
      icon: Sparkles,
      iconColor: 'text-indigo-500',
      items: [
        { label: '1. UPI Daily Limit Exceeded', amount: '₹5,499', amountColor: 'text-emerald-700', amountBg: 'bg-emerald-50', description: 'Autonomous Card switch + 5% incentive via ACP', action: () => onSimulate('UPI_LIMIT') },
        { label: '2. Issuer Outage (SBI NetBanking)', amount: '₹3,200', amountColor: 'text-amber-700', amountBg: 'bg-amber-50', description: 'Bank radar detection + optimal backoff retry delay', action: () => onSimulate('SBI_DOWNTIME') },
        { label: '3. High-Value B2B SaaS Deal', amount: '₹48,500', amountColor: 'text-rose-700', amountBg: 'bg-rose-50', description: 'Circuit breaker trigger + Human-in-the-Loop review', action: () => onSimulate('HIGH_VALUE_B2B') },
        { label: '4. e-Mandate Expired (Recurring)', amount: '₹1,499', amountColor: 'text-indigo-700', amountBg: 'bg-indigo-50', description: '1-click WhatsApp interactive token renewal', action: () => onSimulate('SUBSCRIPTION_HALT') },
        {
          label: '5. Run Batch Ingestion (5 Payments)', amount: '₹1,03,496', amountColor: 'text-indigo-700', amountBg: 'bg-white', description: 'Simulate multi-channel failure stream & compute live recovery evidence',
          action: () => { if (onSimulateBatch) onSimulateBatch(5); },
          isBatch: true, batchBg: 'bg-indigo-50/70', batchHoverBg: 'bg-indigo-100/70', batchBorder: 'border-indigo-200/60', batchTextColor: 'text-indigo-950'
        }
      ]
    },
    {
      title: 'Checkout Abandonment Recovery',
      icon: ShoppingCart,
      iconColor: 'text-emerald-500',
      items: [
        { label: '6. High-Value Enterprise Cart', amount: '₹34,999', amountColor: 'text-emerald-700', amountBg: 'bg-emerald-50', description: 'Platinum CLV, 3-item cart, abandoned at Payment Auth', action: () => { if (onSimulateCheckout) onSimulateCheckout('HIGH_VALUE_CART'); } },
        { label: '7. OTP Timeout (Card 2FA)', amount: '₹12,499', amountColor: 'text-amber-700', amountBg: 'bg-amber-50', description: 'Session expired at OTP entry, transient — 1-click retry', action: () => { if (onSimulateCheckout) onSimulateCheckout('OTP_TIMEOUT'); } },
        {
          label: '8. Run Checkout Batch (4 Abandonments)', amount: '₹59,996', amountColor: 'text-emerald-700', amountBg: 'bg-white', description: 'Multi-stage checkout abandonment stream across devices',
          action: () => { if (onSimulateCheckoutBatch) onSimulateCheckoutBatch(4); },
          isBatch: true, batchBg: 'bg-emerald-50/70', batchHoverBg: 'bg-emerald-100/70', batchBorder: 'border-emerald-200/60', batchTextColor: 'text-emerald-950'
        }
      ]
    },
    {
      title: 'B2B Receivables Recovery',
      icon: FileText,
      iconColor: 'text-orange-500',
      items: [
        { label: '9. 15-Day Overdue (Approval Delay)', amount: '₹87,500', amountColor: 'text-amber-700', amountBg: 'bg-amber-50', description: 'Gold CLV, 85% on-time history, procurement approval stuck', action: () => { if (onSimulateInvoice) onSimulateInvoice('APPROVAL_DELAY'); } },
        { label: '10. 72-Day Overdue (Cash Flow Issue)', amount: '₹3,20,000', amountColor: 'text-rose-700', amountBg: 'bg-rose-50', description: 'Platinum CLV, 45% on-time, manufacturing sector cash crunch', action: () => { if (onSimulateInvoice) onSimulateInvoice('CASHFLOW_ISSUE'); } },
        {
          label: '11. Run Receivables Batch (4 Invoices)', amount: '₹11,32,500', amountColor: 'text-orange-700', amountBg: 'bg-white', description: 'Multi-DPD overdue invoice stream across B2B accounts',
          action: () => { if (onSimulateInvoiceBatch) onSimulateInvoiceBatch(4); },
          isBatch: true, batchBg: 'bg-orange-50/70', batchHoverBg: 'bg-orange-100/70', batchBorder: 'border-orange-200/60', batchTextColor: 'text-orange-950'
        }
      ]
    },
    {
      title: 'Voice Recovery Agent (Hinglish)',
      icon: Phone,
      iconColor: 'text-violet-500',
      items: [
        { label: '12. UPI Fail → Hinglish Voice Call', amount: '₹2,499', amountColor: 'text-violet-700', amountBg: 'bg-violet-50', description: 'Insufficient funds, friendly tone, promise-to-pay flow', action: () => { if (onSimulateVoiceCall) onSimulateVoiceCall('PAYMENT_FAILED', 'HINGLISH', 'FRIENDLY'); } },
        { label: '13. Cart Abandon → English Voice Call', amount: '₹14,999', amountColor: 'text-violet-700', amountBg: 'bg-violet-50', description: 'High-value desktop checkout, 5% discount offered', action: () => { if (onSimulateVoiceCall) onSimulateVoiceCall('CHECKOUT_ABANDONED', 'ENGLISH', 'PROFESSIONAL'); } },
        { label: '14. Overdue Invoice → Hinglish Voice Call', amount: '₹87,500', amountColor: 'text-rose-700', amountBg: 'bg-rose-50', description: '45-day overdue, empathetic tone, 2% settlement offer', action: () => { if (onSimulateVoiceCall) onSimulateVoiceCall('INVOICE_OVERDUE', 'HINGLISH', 'EMPATHETIC'); } },
        {
          label: '15. Run Voice Batch (4 Calls)', amount: '₹1,12,998', amountColor: 'text-violet-700', amountBg: 'bg-white', description: 'Multi-language voice recovery stream across all event types',
          action: () => { if (onSimulateVoiceBatch) onSimulateVoiceBatch(4); },
          isBatch: true, batchBg: 'bg-violet-50/70', batchHoverBg: 'bg-violet-100/70', batchBorder: 'border-violet-200/60', batchTextColor: 'text-violet-950'
        }
      ]
    }
  ];

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
          {/* Global Search Bar */}
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
                  onClick={closeMenu}
                />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95">
                  {simSections.map((section, sIdx) => (
                    <React.Fragment key={sIdx}>
                      {sIdx > 0 && <div className="my-1 border-t border-slate-100"></div>}
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <section.icon className={`w-3 h-3 ${section.iconColor}`} />
                        {section.title}
                      </div>
                      {section.items.map((item, iIdx) => {
                        if (item.isBatch) {
                          return (
                            <button
                              key={iIdx}
                              onClick={() => { item.action(); closeMenu(); }}
                              className={`w-full text-left p-2.5 ${item.batchBg} hover:${item.batchHoverBg} rounded-xl text-xs transition-colors flex flex-col gap-0.5 border ${item.batchBorder}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-bold ${item.batchTextColor} flex items-center gap-1`}>
                                  <Zap className={`w-3.5 h-3.5 ${section.iconColor} fill-current`} />
                                  {item.label}
                                </span>
                                <span className={`text-[10px] font-mono font-bold ${item.amountColor} ${item.amountBg} px-1.5 py-0.2 rounded border ${item.batchBorder}`}>
                                  {item.amount}
                                </span>
                              </div>
                              <span className={`text-[11px] ${item.batchTextColor} font-medium`}>
                                {item.description}
                              </span>
                            </button>
                          );
                        }
                        return (
                          <button
                            key={iIdx}
                            onClick={() => { item.action(); closeMenu(); }}
                            className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl text-xs transition-colors flex flex-col gap-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{item.label}</span>
                              <span className={`text-[10px] font-mono ${item.amountColor} ${item.amountBg} px-1.5 py-0.2 rounded`}>
                                {item.amount}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">{item.description}</span>
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ))}
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
