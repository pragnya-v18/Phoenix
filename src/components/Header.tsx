import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  User,
  LogOut,
  LogIn,
  Database,
  ChevronDown,
  Play,
  Layers,
  Bot,
  FileText
} from 'lucide-react';
import { ExecutiveKPIs, BankHealthMetric } from '../types';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  kpis: ExecutiveKPIs | null;
  bankHealth: BankHealthMetric[];
  onSimulate: (scenario: 'UPI_LIMIT' | 'SBI_DOWNTIME' | 'HIGH_VALUE_B2B' | 'SUBSCRIPTION_HALT') => void;
  isSimulating: boolean;
  currentUser: FirebaseUser | null;
  firebaseConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  kpis,
  bankHealth,
  onSimulate,
  isSimulating,
  currentUser,
  firebaseConnected
}) => {
  const degradedBanks = bankHealth.filter(b => b.status !== 'HEALTHY');

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Firebase sign in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase sign out error:', err);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Activity },
    { id: 'cases', label: `Recovery Cases`, count: kpis?.activeCasesCount, icon: Layers },
    { id: 'agents', label: 'Agent DAG', icon: Bot },
    { id: 'acp', label: 'ACP 2.0 Sandbox', icon: Sparkles },
    { id: 'bank-radar', label: 'Bank Radar', badge: degradedBanks.length > 0 ? `${degradedBanks.length} Degraded` : undefined, icon: Radio },
    { id: 'audits', label: 'Audit Trail', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Slim Top Telemetry Utility Bar */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Agent Mesh Online</span>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
            <Database className={`w-3 h-3 ${firebaseConnected ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Firestore: <span className={firebaseConnected ? 'text-indigo-600 font-semibold' : 'text-slate-400'}>{firebaseConnected ? 'Connected' : 'Standby'}</span></span>
          </div>

          <span className="text-slate-300 hidden md:inline">|</span>

          <span className="text-slate-500 text-[11px] font-mono hidden md:inline">
            Protocol: <strong className="text-slate-700">ACP/2.0</strong>
          </span>
        </div>

        {/* Live Bank Switch Telemetry Ticker */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider hidden sm:inline">
            Issuer Health:
          </span>
          {bankHealth.slice(0, 4).map(bank => (
            <div 
              key={bank.bankCode} 
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                bank.status === 'HEALTHY' 
                  ? 'bg-slate-100 text-slate-700 border border-slate-200/60' 
                  : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${bank.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span className="font-semibold">{bank.bankCode}</span>
              <span className="text-slate-500">{bank.rollingSuccessRatePct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shadow-indigo-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900">
                RecoverFlow <span className="text-indigo-600">AI</span>
              </h1>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-200">
                Razorpay Edition
              </span>
            </div>
          </div>
        </div>

        {/* Segmented Navigation Tab Bar */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side Actions: Demo Simulator + Auth */}
        <div className="flex items-center gap-2.5">
          {/* Quick Simulation Dropdown for Judges */}
          <div className="relative group">
            <button
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isSimulating ? 'Simulating...' : 'Simulate Failure'}</span>
              <ChevronDown className="w-3 h-3 text-indigo-400" />
            </button>

            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200/90 p-1.5 hidden group-hover:block z-50 transition-all">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Failure Scenario
              </div>
              <button
                onClick={() => onSimulate('UPI_LIMIT')}
                className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-xs transition-colors flex flex-col"
              >
                <span className="font-semibold text-slate-800">1. UPI Limit Exceeded (₹5,499)</span>
                <span className="text-[11px] text-slate-500">Autonomous Card switch + 5% discount</span>
              </button>
              <button
                onClick={() => onSimulate('SBI_DOWNTIME')}
                className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-xs transition-colors flex flex-col"
              >
                <span className="font-semibold text-slate-800">2. Bank Outage (SBI NetBanking)</span>
                <span className="text-[11px] text-slate-500">Smart backoff + tokenized card offer</span>
              </button>
              <button
                onClick={() => onSimulate('HIGH_VALUE_B2B')}
                className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-xs transition-colors flex flex-col"
              >
                <span className="font-semibold text-slate-800">3. High-Value B2B (₹48,500)</span>
                <span className="text-[11px] text-slate-500">Circuit breaker + Human-in-the-Loop</span>
              </button>
              <button
                onClick={() => onSimulate('SUBSCRIPTION_HALT')}
                className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-xs transition-colors flex flex-col"
              >
                <span className="font-semibold text-slate-800">4. e-Mandate Expired (₹1,499)</span>
                <span className="text-[11px] text-slate-500">1-click WhatsApp mandate renewal</span>
              </button>
            </div>
          </div>

          {/* Firebase Authentication */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'Operator'} 
                  className="w-5 h-5 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className="text-xs font-medium text-slate-700 max-w-[100px] truncate hidden sm:inline">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Operator Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
