import { useState, useCallback, useRef } from 'react';

export interface DemoStep {
  id: number;
  label: string;
  narration: string;
  tab: string;
  action: 'simulate' | 'wait' | 'navigate';
  actionParam?: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    label: 'Ingesting failure webhook',
    narration: 'Razorpay payment.failed webhook intercepted. Recovery case REC-2026-881 created.',
    tab: 'cases',
    action: 'simulate',
    actionParam: 'UPI_LIMIT'
  },
  {
    id: 2,
    label: 'Diagnosing root cause',
    narration: 'Gemini 2.0 Flash classified root cause: UPI daily limit exceeded on HDFC. Confidence: 94%.',
    tab: 'cases',
    action: 'wait'
  },
  {
    id: 3,
    label: 'Formulating strategy',
    narration: 'Strategy Optimizer computed Expected Value: 5% discount (₹250) on Visa card switch yields 91% recovery probability.',
    tab: 'cases',
    action: 'wait'
  },
  {
    id: 4,
    label: 'Generating payment link',
    narration: 'Recovery Agent created Razorpay payment link. WhatsApp interactive message dispatched.',
    tab: 'cases',
    action: 'wait'
  },
  {
    id: 5,
    label: 'Settlement confirmed',
    narration: 'payment_link.paid webhook received. Revenue recovered: ₹4,749. KPIs updated.',
    tab: 'dashboard',
    action: 'wait'
  }
];

export function useDemoWalkthrough(
  simulateScenario: (scenario: 'UPI_LIMIT' | 'SBI_DOWNTIME' | 'HIGH_VALUE_B2B' | 'SUBSCRIPTION_HALT') => void,
  setActiveTab: (tab: string) => void
) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cleanup = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const startDemo = useCallback(() => {
    cleanup();
    setIsRunning(true);
    setCurrentStep(0);
    setCompletedSteps([]);

    let stepIndex = 0;

    const advanceStep = () => {
      if (stepIndex >= DEMO_STEPS.length) {
        setIsRunning(false);
        setCurrentStep(0);
        return;
      }

      const step = DEMO_STEPS[stepIndex];
      setCurrentStep(step.id);

      if (step.action === 'simulate') {
        simulateScenario('UPI_LIMIT');
      }

      if (step.tab) {
        setActiveTab(step.tab);
      }

      setCompletedSteps(prev => [...prev, step.id]);
      stepIndex++;

      if (stepIndex < DEMO_STEPS.length) {
        const timer = setTimeout(advanceStep, 2500);
        timersRef.current.push(timer);
      } else {
        const timer = setTimeout(() => {
          setIsRunning(false);
          setCurrentStep(0);
        }, 2000);
        timersRef.current.push(timer);
      }
    };

    advanceStep();
  }, [cleanup, simulateScenario, setActiveTab]);

  const cancelDemo = useCallback(() => {
    cleanup();
    setIsRunning(false);
    setCurrentStep(0);
    setCompletedSteps([]);
  }, [cleanup]);

  return {
    isRunning,
    currentStep,
    completedSteps,
    steps: DEMO_STEPS,
    startDemo,
    cancelDemo
  };
}
