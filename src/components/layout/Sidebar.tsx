import React from 'react';
import { 
  Activity, 
  Layers, 
  Bot, 
  Sparkles, 
  Radio, 
  FileText, 
  ShieldCheck, 
  Database, 
  LogOut, 
  LogIn, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  Zap,
  Server,
  BellRing
} from 'lucide-react';
import { ExecutiveKPIs, BankHealthMetric } from '../../types';
import { auth, googleAuthProvider } from '../../lib/firebase';
import { signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  kpis: ExecutiveKPIs | null;
  bankHealth: BankHealthMetric[];
  currentUser: FirebaseUser | null;
  firebaseConnected: boolean;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  kpis,
  bankHealth,
  currentUser,
  firebaseConnected,
  collapsed,
  setCollapsed
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

  const navSections = [
    {
      group: 'Operations',
      items: [
        { id: 'dashboard', label: 'Mission Control', icon: Activity, badge: undefined },
        { 
          id: 'cases', 
          label: 'Case Intelligence', 
          icon: Layers, 
          badge: kpis?.activeCasesCount ? `${kpis.activeCasesCount}` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300' 
        },
        { id: 'agents', label: 'Agent Orchestration', icon: Bot, badge: '7 Nodes', badgeColor: 'bg-emerald-500/20 text-emerald-300' }
      ]
    },
    {
      group: 'Protocols',
      items: [
        { id: 'acp', label: 'Protocol Monitor', icon: Sparkles, badge: 'ACP', badgeColor: 'bg-violet-500/20 text-violet-300' },
        { 
          id: 'bank-radar', 
          label: 'Switch Telemetry', 
          icon: Radio, 
          badge: degradedBanks.length > 0 ? `${degradedBanks.length} Alert` : 'Healthy',
          badgeColor: degradedBanks.length > 0 ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-emerald-500/20 text-emerald-300'
        }
      ]
    },
    {
      group: 'Compliance',
      items: [
        { id: 'audits', label: 'Forensic Timeline', icon: FileText, badge: undefined }
      ]
    }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-slate-950 text-slate-300 border-r border-slate-800/80 transition-all duration-300 flex flex-col justify-between ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white tracking-tight">RecoverFlow</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    v2.0
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">AI Recovery OS</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Item Groups */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-250px)]">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {sec.group}
                </div>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`} />
                    {!collapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        item.badgeColor || (isActive ? 'bg-indigo-900 text-white' : 'bg-slate-800 text-slate-300')
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed Tooltip Dot Indicator */}
                    {collapsed && isActive && (
                      <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Telemetry & Operator Profile Section */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
        {/* System Status Indicator */}
        {!collapsed ? (
          <div className="px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${degradedBanks.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
            <span className="text-slate-400 font-medium">
              {degradedBanks.length > 0 ? `${degradedBanks.length} switch${degradedBanks.length > 1 ? 's' : ''} degraded` : 'All Systems Operational'}
            </span>
          </div>
        ) : null}

        {/* System Mesh Status Card (when expanded) */}
        {!collapsed ? (
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold">Agent Mesh Health</span>
              <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                99.98%
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <Database className={`w-3 h-3 ${firebaseConnected ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>Firestore DB</span>
              </span>
              <span className={`font-mono text-[10px] font-semibold ${firebaseConnected ? 'text-indigo-400' : 'text-slate-500'}`}>
                {firebaseConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Agent Mesh Online">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        )}

        {/* Operator Profile / Google Auth */}
        {currentUser ? (
          <div className={`flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2 overflow-hidden">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'Operator'} 
                  className="w-7 h-7 rounded-lg shrink-0 object-cover border border-indigo-500/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'O'}
                </div>
              )}
              {!collapsed && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">SecOps Lead</div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className={`w-full flex items-center gap-2 py-2 px-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs ${collapsed ? 'justify-center' : ''}`}
            title="Operator Login"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Operator Login</span>}
          </button>
        )}
      </div>

      {/* AI Engine Badge */}
      {!collapsed && (
        <div className="px-5 pb-3 text-center">
          <span className="text-[9px] text-slate-600 font-medium">Powered by Gemini 3.7 Flash</span>
        </div>
      )}
    </aside>
  );
};
