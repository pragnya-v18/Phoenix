import React from 'react';
import { 
  Network, 
  BrainCircuit, 
  Activity, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Zap,
  CheckCircle2, 
  Lock, 
  Cpu, 
  Layers,
  ChevronRight,
  AlertTriangle,
  Play
} from 'lucide-react';
import { RecoveryCase } from '../types';

interface AgentMonitorViewProps {
  cases: RecoveryCase[];
  selectedCase: RecoveryCase | null;
  onSelectCase: (c: RecoveryCase) => void;
}

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
      name: 'Detection & Ingestion Agent',
      role: 'Webhook Interception & CLV Scoring',
      model: 'Fast Rule Filter',
      status: currentCase ? 'COMPLETED' : 'IDLE',
      latency: '24ms',
      details: currentCase 
        ? `Intercepted error "${currentCase.sourceEvent.errorCode}". Assigned CLV tier ${currentCase.customer.clvTier} with ${currentCase.riskTier} urgency tier.` 
        : 'Awaiting failure event.'
    },
    {
      id: 'diagnosis',
      step: '02',
      name: 'Diagnosis & Forensics Agent',
      role: 'Gateway Error Analysis & Bank Health Grounding',
      model: 'Gemini 3.7 Flash',
      status: currentCase?.diagnosis ? 'COMPLETED' : 'IDLE',
      latency: '142ms',
      details: currentCase?.diagnosis 
        ? `${currentCase.diagnosis.rootCauseDetail} (Bank: ${currentCase.diagnosis.bankCode} switch index: ${currentCase.diagnosis.bankSwitchHealthIndex}%).` 
        : 'Pending root cause deduction.'
    },
    {
      id: 'strategy',
      step: '03',
      name: 'Strategy & Economics Optimizer',
      role: 'Expected-Value Maximization & Channel Selection',
      model: 'Gemini 3.7 Flash (Reasoning)',
      status: currentCase?.strategy ? 'COMPLETED' : 'IDLE',
      latency: '188ms',
      details: currentCase?.strategy 
        ? currentCase.strategy.reasoning 
        : 'Formulating optimal recovery incentive.'
    },
    {
      id: 'negotiation',
      step: '04',
      name: 'ACP 2.0 Negotiation Agent',
      role: 'Agent-to-Agent Commerce Dialogue',
      model: 'ACP/UCP Inter-Agent Protocol',
      status: currentCase?.acpSession ? 'COMPLETED' : 'IDLE',
      latency: '310ms',
      details: currentCase?.acpSession 
        ? `Executed ACP 2.0 dialogue with customer agent (${currentCase.acpSession.dialogue.length} messages exchanged). Session status: ${currentCase.acpSession.status}.` 
        : 'No active negotiation required.'
    },
    {
      id: 'compliance',
      step: '05',
      name: 'Compliance & Safety Agent',
      role: 'RBI Quiet Hours, Max 10% Discount & Fatigue Limit',
      model: 'Policy Guardrail Validator',
      status: currentCase?.compliance?.requiresHumanApproval ? 'HALTED_HITL' : (currentCase?.compliance ? 'COMPLETED' : 'IDLE'),
      latency: '32ms',
      details: currentCase?.compliance 
        ? (currentCase.compliance.requiresHumanApproval 
            ? `HALTED (Human Clearance Required): ${currentCase.compliance.violations.join('; ')}` 
            : `CLEARED: ${currentCase.compliance.rulesPassed.join(', ')}`) 
        : 'Evaluating safety guardrails.'
    },
    {
      id: 'execution',
      step: '06',
      name: 'Recovery Execution Agent',
      role: 'Razorpay Dynamic Payment Rail Switch & Dispatch',
      model: 'Razorpay API SDK',
      status: currentCase?.status === 'RECOVERED' || currentCase?.status === 'EXECUTING' ? 'COMPLETED' : 'IDLE',
      latency: '85ms',
      details: currentCase?.status === 'RECOVERED' 
        ? `Dispatched dynamic payment link via ${currentCase.strategy?.targetChannel || 'WHATSAPP'}.` 
        : 'Awaiting compliance clearance.'
    },
    {
      id: 'outcome',
      step: '07',
      name: 'Outcome & Attribution Agent',
      role: 'Revenue Capture & Channel Attribution Ledger',
      model: 'Attribution Engine',
      status: currentCase?.outcome?.isRecovered ? 'COMPLETED' : 'IDLE',
      latency: '15ms',
      details: currentCase?.outcome 
        ? `Captured ₹${currentCase.outcome.recoveredAmount.toLocaleString('en-IN')} via Razorpay. Attributed to ${currentCase.outcome.attributedChannel}.` 
        : 'Pending final settlement.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <span>LangGraph Multi-Agent Execution Pipeline</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Directed Acyclic Graph (DAG) inspecting reasoning traces, decision logic, and latencies across all 7 autonomous agents
          </p>
        </div>

        {/* Case Switcher */}
        {cases.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Inspecting Case:</span>
            <select
              value={currentCase?.caseId}
              onChange={(e) => {
                const target = cases.find(c => c.caseId === e.target.value);
                if (target) onSelectCase(target);
              }}
              className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 shadow-xs focus:outline-hidden"
            >
              {cases.map(c => (
                <option key={c.caseId} value={c.caseId}>
                  {c.caseId} - ₹{c.amount.toLocaleString('en-IN')} ({c.customer.name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Interactive Agent Pipeline DAG */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="space-y-3">
          {agentNodes.map((node, index) => (
            <div key={node.id} className="relative">
              {/* Connector line */}
              {index < agentNodes.length - 1 && (
                <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-slate-200/80 -mb-3 z-0"></div>
              )}

              <div className="relative z-10 flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 transition-all bg-white hover:bg-slate-50/50">
                {/* Step badge */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs ${
                  node.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : node.status === 'HALTED_HITL'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {node.step}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{node.name}</h4>
                      <span className="text-[10px] text-slate-500 hidden sm:inline">•</span>
                      <span className="text-[11px] text-slate-500 hidden sm:inline">{node.role}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                        {node.model}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {node.latency}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        node.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : node.status === 'HALTED_HITL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-300'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {node.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                    {node.details}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
