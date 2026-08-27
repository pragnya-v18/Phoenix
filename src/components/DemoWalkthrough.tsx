import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { DemoStep } from '../hooks/useDemoWalkthrough';

interface DemoWalkthroughProps {
  isRunning: boolean;
  currentStep: number;
  completedSteps: number[];
  steps: DemoStep[];
  onStart: () => void;
  onCancel: () => void;
}

export const DemoWalkthrough: React.FC<DemoWalkthroughProps> = ({
  isRunning,
  currentStep,
  completedSteps,
  steps,
  onCancel
}) => {
  const [visibleToasts, setVisibleToasts] = useState<DemoStep[]>([]);

  useEffect(() => {
    if (currentStep > 0) {
      const step = steps.find(s => s.id === currentStep);
      if (step) {
        setVisibleToasts(prev => [...prev, step]);
      }
    }
  }, [currentStep, steps]);

  useEffect(() => {
    if (!isRunning && visibleToasts.length > 0) {
      const timer = setTimeout(() => setVisibleToasts([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [isRunning, visibleToasts.length]);

  const activeStep = steps.find(s => s.id === currentStep);

  if (!isRunning && visibleToasts.length === 0) return null;

  return (
    <>
      {/* Active progress bar */}
      {isRunning && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 px-6 py-3">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span className="text-[11px] font-bold text-slate-200">
                  {activeStep?.label || 'Starting demo...'}
                </span>
              </div>
              <button
                onClick={onCancel}
                className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
            <div className="flex gap-1">
              {steps.map(step => (
                <div
                  key={step.id}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    completedSteps.includes(step.id)
                      ? 'bg-indigo-500'
                      : step.id === currentStep
                      ? 'bg-indigo-400/50 animate-pulse'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 max-w-lg">
              {activeStep?.narration || ''}
            </p>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-16 right-4 z-50 space-y-2 pointer-events-none">
        {visibleToasts.map((step) => (
          <div
            key={step.id}
            className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-lg px-4 py-2.5 shadow-lg max-w-sm animate-in slide-in-from-right"
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-200">{step.label}</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">{step.narration}</p>
          </div>
        ))}
      </div>
    </>
  );
};
