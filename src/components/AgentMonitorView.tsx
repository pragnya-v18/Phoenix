import React from 'react';
import { 
  BrainCircuit, 
  ShieldCheck, 
  Sparkles, 
  Zap,
  CheckCircle2, 
  AlertTriangle,
  Bot,
  Target,
  Rocket,
  TrendingUp,
  Lock
} from 'lucide-react';
import { RecoveryCase } from '../types';

interface AgentMonitorViewProps {
  cases: RecoveryCase[];
  selectedCase: RecoveryCase | null;
  onSelectCase: (c: RecoveryCase) => void;
}

const AGENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  detection: Bot,
  diagnosis: BrainCircuit,
  strategy: Target,
  negotiation: Sparkles,
  compliance: ShieldCheck,
  execution: Rocket,
  outcome: TrendingUp
};

export const AgentMonitorView: React.FC<AgentMonitorViewProps> = ({
  cases,
  selectedCase,
  onSelectCase
}) => {
  const currentCase = selectedCase || cases[0];

  const agentNodes = [
    {
      id: 'detection',
      step: '01',
      name: 'Detection Agent',
      role: 'Webhook Interception & CLV Scoring',
      model: 'Fast Rule Filter',
      status: currentCase ? 'COMPLETED' : 'IDLE',
      latency: '24ms',
      details: currentCase 
        ? `Intercepted error "${currentCase.sourceEvent.errorCode}". Assigned CLV tier ${currentCase.customer.clvTier} with ${currentCase.riskTier} urgency.` 
        : 'Awaiting failure event.'
    },
    {
      id: 'diagnosis',
      step: '02',
      name: 'Diagnosis Agent',
      role: 'Gateway Error Analysis & Bank Health',
      model: 'Gemini 2.0 Flash',
      status: currentCase?.diagnosis ? 'COMPLETED' : 'IDLE',
      latency: '142ms',
      details: currentCase?.diagnosis 
        ? `${currentCase.diagnosis.rootCauseDetail} (Bank: ${currentCase.diagnosis.bankCode}, health: ${currentCase.diagnosis.bankSwitchHealthIndex}%).` 
        : 'Pending root cause deduction.'
    },
    {
      id: 'strategy',
      step: '03',
      name: 'Strategy Optimizer',
      role: 'Expected-Value Maximization',
      model: 'Gemini 2.0 Flash',
      status: currentCase?.strategy ? 'COMPLETED' : 'IDLE',
      latency: '188ms',
      details: currentCase?.strategy 
        ? currentCase.strategy.reasoning 
        : 'Formulating optimal recovery incentive.'
    },
    {
      id: 'negotiation',
      step: '04',
      name: 'ACP Negotiation (Demo)',
      role: 'Agent-to-Agent Commerce',
      model: 'Demo — ACP 2.0 Protocol',
      status: currentCase?.acpSession ? 'COMPLETED' : 'IDLE',
      latency: '310ms',
      details: currentCase?.acpSession 
        ? `ACP dialogue: ${currentCase.acpSession.dialogue.length} messages exchanged. Session: ${currentCase.acpSession.status}.` 
        : 'No active negotiation required.'
    },
    {
      id: 'compliance',
      step: '05',
      name: 'Compliance Guard',
      role: 'RBI Quiet Hours & Discount Limits',
      model: 'Policy Validator',
      status: currentCase?.compliance?.requiresHumanApproval ? 'HALTED' : (currentCase?.compliance ? 'CLEARED' : 'IDLE'),
      latency: '32ms',
      details: currentCase?.compliance 
        ? (currentCase.compliance.requiresHumanApproval 
            ? `HALTED: ${currentCase.compliance.violations.join('; ')}` 
            : `CLEARED: ${currentCase.compliance.rulesPassed.join(', ')}`) 
        : 'Evaluating safety guardrails.'
    },
    {
      id: 'execution',
      step: '06',
      name: 'Execution Agent',
      role: 'Razorpay Rail Switch & Dispatch',
      model: 'Razorpay SDK',
      status: currentCase?.status === 'RECOVERED' || currentCase?.status === 'EXECUTING' ? 'COMPLETED' : 'IDLE',
      latency: '85ms',
      details: currentCase?.status === 'RECOVERED' 
        ? `Dispatched via ${currentCase.strategy?.targetChannel || 'WHATSAPP'}. Payment captured.` 
        : 'Awaiting compliance clearance.'
    },
    {
      id: 'outcome',
      step: '07',
      name: 'Attribution Agent',
      role: 'Revenue Capture & Channel Attribution',
      model: 'Attribution Engine',
      status: currentCase?.outcome?.isRecovered ? 'COMPLETED' : 'IDLE',
      latency: '15ms',
      details: currentCase?.outcome 
        ? `Captured ₹${currentCase.outcome.recoveredAmount.toLocaleString('en-IN')} via Razorpay. Channel: ${currentCase.outcome.attributedChannel}.` 
        : 'Pending final settlement.'
    }
  ];

  const completedCount = agentNodes.filter(n => n.status === 'COMPLETED' || n.status === 'CLEARED').length;
  const progress = (completedCount / agentNodes.length) * 100;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-indigo-600" />
            Agent Execution Mesh
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            7-node LangGraph DAG · {completedCount}/{agentNodes.length} stages completed
          </p>
        </div>
        {cases.length > 0 && (
          <select
            value={currentCase?.caseId}
            onChange={(e) => {
              const target = cases.find(c => c.caseId === e.target.value);
              if (target) onSelectCase(target);
            }}
            className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold text-indigo-700 shadow-xs focus:outline-hidden"
          >
            {cases.map(c => (
              <option key={c.caseId} value={c.caseId}>{c.caseId} — ₹{c.amount.toLocaleString('en-IN')}</option>
            ))}
          </select>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Progress</span>
          <span className="text-[10px] font-mono text-indigo-700">{completedCount}/{agentNodes.length}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Agent Nodes */}
      <div className="space-y-2">
        {agentNodes.map((node, index) => {
          const Icon = AGENT_ICONS[node.id] || Bot;
          const isCompleted = node.status === 'COMPLETED' || node.status === 'CLEARED';
          const isHalted = node.status === 'HALTED';
          const isActive = isCompleted || isHalted;

          return (
            <div key={node.id} className="relative group">
              {/* Vertical connector */}
              {index < agentNodes.length - 1 && (
                <div className={`absolute left-[22px] top-[52px] bottom-0 w-0.5 z-0 ${
                  isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                }`} />
              )}

              <div className={`relative z-10 flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                isHalted ? 'bg-amber-50/50 border-amber-300 shadow-xs' :
                isCompleted ? 'bg-white border-slate-200/80 shadow-xs' :
                'bg-slate-50/50 border-slate-200/60'
              }`}>
                {/* Node icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                  isHalted ? 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse' :
                  isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400">{node.step}</span>
                      <h4 className="text-xs font-bold text-slate-900">{node.name}</h4>
                      <span className="text-[10px] text-slate-400 hidden sm:inline">·</span>
                      <span className="text-[11px] text-slate-500 hidden sm:inline">{node.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                        {node.model}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{node.latency}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isHalted ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {node.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed bg-white/80 p-2 rounded-lg border border-slate-100">
                    {node.details}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
