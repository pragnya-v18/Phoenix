/**
 * Recovery Intelligence Feedback Loop — Learning types
 * Stores per-case terminal outcomes and derives self-correction evidence
 * for the AI agent (pure deterministic arithmetic — no retraining).
 */

import { ChannelType } from './case';

export type LearningOutcomeStatus = 'SUCCESS' | 'FAILURE';

/**
 * A stored terminal outcome for one attempted case. This is the unit of
 * "experience" the loop learns from: what the AI predicted versus what
 * actually happened.
 */
export interface RecoveryLearningOutcome {
  caseId: string;
  merchantId: string;
  eventType: string;
  rootCauseCategory: string | null;
  riskTier: string | null;
  predictedProbability: number;   // strategy.expectedRecoveryProbability (clamped)
  selectedChannel: string | null; // strategy.targetChannel if one was selected
  incentiveINR: number;
  amountINR: number;
  actualOutcome: LearningOutcomeStatus;
  recoveredAmountINR: number;
  failureReason?: string;
  recordedAt: string;
}

export interface ChannelEffectiveness {
  channel: string;
  attempts: number;
  successRatePct: number;
  recoveredINR: number;
}

export interface CalibrationBucket {
  bucket: string;
  count: number;
  avgPredictedPct: number;
  actualSuccessPct: number;
}

export interface LearningMetrics {
  casesLearnedFrom: number;
  predictionAccuracyPct: number;
  falsePositives: number;
  falseNegatives: number;
  avgPredictedPct: number;
  calibration: CalibrationBucket[];
  channelEffectiveness: ChannelEffectiveness[];
  correctedExamples: string[];
  mintedAt: string;
}

export interface HistoricalEvidence {
  similarCases: number;
  successRatePct: number;
  recoveredINR: number;
  byChannel: ChannelEffectiveness[];
  minSamplesMet: boolean;
}

export type EvidenceInfluence =
  | 'none'
  | 'calibrated-down'
  | 'calibrated-up'
  | 'channel-shift';

/**
 * Stamped onto a StrategyRecord when historical evidence changed the
 * decision signal (probability and/or channel recommendation). Purely
 * additive — never weakens compliance or EV guardrails.
 */
export interface RecoveryEvidenceStamp {
  similarCases: number;
  historicalSuccessRatePct: number;
  rawProbability: number;       // probability BEFORE history adjustment (as RMS)
  adjustedProbability: number;  // probability AFTER history adjustment (as RMS)
  influence: EvidenceInfluence;
  recommendedChannel?: ChannelType;
}