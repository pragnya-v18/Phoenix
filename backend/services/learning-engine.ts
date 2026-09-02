/**
 * RecoverFlow AI - Recovery Intelligence Feedback Loop
 * Pure, deterministic functions over stored terminal outcomes.
 *
 * The loop closes at three points:
 *   1. RECORD — when a case reaches a terminal state (RECOVERED/FAILED/DISMISSED)
 *      and a dispatch was attempted, the predicted vs actual outcome is stored.
 *   2. ADJUST — when a NEW strategy is created, historical evidence for the same
 *      root-cause profile adjusts the expected recovery probability and flags a
 *      better-performing channel recommendation. Compliance / settlement guard /
 *      EV verdicts run AFTER this and are never weakened by it.
 *   3. REPORT — getLearningMetrics() turns stored experience into visible,
 *      verifiable accuracy + calibration numbers.
 *
 * No model retraining, no vector DB, no RAG — stored outcomes + arithmetic.
 */

import {
  RecoveryLearningOutcome,
  HistoricalEvidence,
  ChannelEffectiveness,
  CalibrationBucket,
  LearningMetrics,
  RecoveryEvidenceStamp,
  RecoveryCase,
  StrategyRecord
} from '../../src/types/index.js';

const MIN_HISTORY_SAMPLES = 3;      // evidence only counts after N similar cases
const MAX_PREDICTED = 0.97;
const MIN_PREDICTED = 0.05;
const WEIGHT_RAMP_CASES = 20;       // weight = min(1, similarCases / 20)
const CHANNEL_SHIFT_MARGIN_PP = 10; // recommend a switch when >= this gap, PP

export function clampProbability(p: number): number {
  if (!Number.isFinite(p)) return MIN_PREDICTED;
  return Math.min(MAX_PREDICTED, Math.max(MIN_PREDICTED, p));
}

/**
 * Build the learning record for a terminal case.
 * Returns null when nothing was actually attempted (no strategy) or the case
 * is not terminal — settlement-guard-blocked cases carry no strategy and are
 * automatically excluded (they must not count against prediction accuracy).
 */
export function buildLearningOutcome(recoveryCase: RecoveryCase): RecoveryLearningOutcome | null {
  if (!recoveryCase.strategy) return null;
  const status = recoveryCase.status;
  if (status !== 'RECOVERED' && status !== 'FAILED' && status !== 'DISMISSED') return null;

  const prob = recoveryCase.strategy.expectedRecoveryProbability;
  if (!Number.isFinite(prob)) return null;

  const success = status === 'RECOVERED';

  return {
    caseId: recoveryCase.caseId,
    merchantId: recoveryCase.merchantId,
    eventType: recoveryCase.eventType,
    rootCauseCategory: recoveryCase.diagnosis?.rootCauseCategory ?? null,
    riskTier: recoveryCase.riskTier,
    predictedProbability: clampProbability(prob),
    selectedChannel: recoveryCase.strategy.targetChannel ?? null,
    incentiveINR: recoveryCase.strategy.calculatedIncentiveINR || 0,
    amountINR: recoveryCase.amount || 0,
    actualOutcome: success ? 'SUCCESS' : 'FAILURE',
    recoveredAmountINR: success ? (recoveryCase.outcome?.recoveredAmount || 0) : 0,
    failureReason: success ? undefined : (
      recoveryCase.diagnosis?.rootCauseDetail ||
      recoveryCase.humanActionNotes ||
      'NO_RESPONSE'
    ),
    recordedAt: recoveryCase.updatedAt || new Date().toISOString()
  };
}

export function channelStats(outcomes: RecoveryLearningOutcome[]): ChannelEffectiveness[] {
  const grouped = new Map<string, RecoveryLearningOutcome[]>();
  for (const o of outcomes) {
    if (!o.selectedChannel) continue;
    const list = grouped.get(o.selectedChannel) || [];
    list.push(o);
    grouped.set(o.selectedChannel, list);
  }
  const result: ChannelEffectiveness[] = [];
  for (const [channel, list] of grouped) {
    const successCount = list.filter(o => o.actualOutcome === 'SUCCESS').length;
    result.push({
      channel,
      attempts: list.length,
      successRatePct: Math.round((successCount / list.length) * 10000) / 100,
      recoveredINR: list.reduce((sum, o) => sum + (o.recoveredAmountINR || 0), 0)
    });
  }
  return result.sort((a, b) => b.attempts - a.attempts || b.successRatePct - a.successRatePct);
}

/**
 * Historical evidence for a candidate case profile. Matches by exact root-cause
 * category; falls back to event-type + risk-tier when category evidence is thin.
 */
export function similarHistory(
  query: { rootCauseCategory: string | null | undefined; eventType: string; riskTier: string },
  outcomes: RecoveryLearningOutcome[]
): HistoricalEvidence {
  let matches: RecoveryLearningOutcome[] = [];
  if (query.rootCauseCategory) {
    matches = outcomes.filter(o => o.rootCauseCategory === query.rootCauseCategory);
  }
  if (matches.length < MIN_HISTORY_SAMPLES) {
    const fallback = outcomes.filter(o => o.eventType === query.eventType && o.riskTier === query.riskTier);
    if (fallback.length > matches.length) matches = fallback;
  }

  const successCount = matches.filter(o => o.actualOutcome === 'SUCCESS').length;
  const byChannel = channelStats(matches);

  return {
    similarCases: matches.length,
    successRatePct: matches.length ? Math.round((successCount / matches.length) * 10000) / 100 : 0,
    recoveredINR: matches.reduce((sum, o) => sum + (o.recoveredAmountINR || 0), 0),
    byChannel,
    minSamplesMet: matches.length >= MIN_HISTORY_SAMPLES
  };
}

/**
 * Adjusts the strategy using historical evidence.
 * - Adjusts expectedRecoveryProbability toward the historical success rate
 *   (ramped by evidence volume, hard-clamped).
 * - Stamps recoveryEvidence so the UI can show before/after transparently.
 * - Flags a channel recommendation when a rival channel beats the current one
 *   by >= CHANNEL_SHIFT_MARGIN_PP on >= MIN_HISTORY_SAMPLES attempts.
 * Never throws; on any uncertainty it returns the strategy untouched.
 */
export function applyHistoricalEvidence(
  strategy: StrategyRecord,
  recoveryCase: RecoveryCase,
  outcomes: RecoveryLearningOutcome[]
): StrategyRecord {
  try {
    const history = similarHistory(
      {
        rootCauseCategory: recoveryCase.diagnosis?.rootCauseCategory,
        eventType: recoveryCase.eventType,
        riskTier: recoveryCase.riskTier
      },
      outcomes
    );

    if (!history.minSamplesMet) return strategy;

    const base = clampProbability(strategy.expectedRecoveryProbability);
    const histRate = history.successRatePct / 100;
    const weight = Math.min(1, history.similarCases / WEIGHT_RAMP_CASES);
    const adjusted = clampProbability(base + (histRate - base) * weight);

    let recommendedChannel: StrategyRecord['targetChannel'] | undefined;
    let channelShift = false;
    if (strategy.targetChannel) {
      const candidates = history.byChannel
        .filter(c => c.attempts >= MIN_HISTORY_SAMPLES)
        .sort((a, b) => b.successRatePct - a.successRatePct);
      const current = history.byChannel.find(c => c.channel === strategy.targetChannel);
      const best = candidates[0];
      if (current && best && best.channel !== current.channel &&
          best.successRatePct - current.successRatePct >= CHANNEL_SHIFT_MARGIN_PP) {
        recommendedChannel = best.channel as StrategyRecord['targetChannel'];
        channelShift = true;
      }
    }

    const delta = Math.abs(adjusted - base);
    const influence: RecoveryEvidenceStamp['influence'] =
      channelShift
        ? 'channel-shift'
        : (delta > 0.01
            ? (adjusted > base ? 'calibrated-up' : 'calibrated-down')
            : 'none');

    return {
      ...strategy,
      expectedRecoveryProbability: adjusted,
      recoveryEvidence: {
        similarCases: history.similarCases,
        historicalSuccessRatePct: history.successRatePct,
        rawProbability: Math.round(base * 10000) / 100,
        adjustedProbability: Math.round(adjusted * 10000) / 100,
        influence,
        recommendedChannel
      }
    };
  } catch (err) {
    // Evidence is best-effort by design — never perturb a working strategy.
    console.warn('[LearningEngine] applyHistoricalEvidence skipped:', err);
    return strategy;
  }
}

function buildCorrectedExamples(outcomes: RecoveryLearningOutcome[]): string[] {
  const sorted = [...outcomes].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  const examples: string[] = [];
  for (const o of sorted) {
    const label = o.rootCauseCategory || o.eventType;
    const channel = o.selectedChannel || 'direct';
    const predictedPct = Math.round(o.predictedProbability * 100);
    if (o.actualOutcome === 'FAILURE' && o.predictedProbability >= 0.65) {
      examples.push(
        `Case ${o.caseId}: predicted ${predictedPct}% confidence via ${channel} (${label}) but did NOT recover — confidence dampened for similar future cases.`
      );
    } else if (o.actualOutcome === 'SUCCESS' && o.predictedProbability < 0.5) {
      examples.push(
        `Case ${o.caseId}: predicted only ${predictedPct}% via ${channel} (${label}) but recovered ₹${o.recoveredAmountINR.toLocaleString('en-IN')} — confidence raised for similar future cases.`
      );
    }
    if (examples.length >= 5) break;
  }
  if (examples.length === 0) {
    examples.push('No self-corrections yet — live failures/dismissals will appear here as the loop learns.');
  }
  return examples;
}

/**
 * Hand-authored "Learning Evidence" lines from the ADJUSTMENT path: cases whose
 * live strategy was actually modified by historical evidence (influence != none).
 */
export function buildEvidenceExamples(cases: RecoveryCase[]): string[] {
  const stamped = cases
    .filter(c => c.strategy?.recoveryEvidence && c.strategy.recoveryEvidence.influence !== 'none')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const out: string[] = [];
  for (const c of stamped.slice(0, 6)) {
    const ev = c.strategy!.recoveryEvidence!;
    const label = c.diagnosis?.rootCauseCategory || c.eventType;
    if (ev.influence === 'channel-shift' && ev.recommendedChannel) {
      out.push(
        `Case ${c.caseId} (${label}): historical evidence favors ${ev.recommendedChannel} (${ev.historicalSuccessRatePct.toFixed(0)}% success over ${ev.similarCases} similar cases) over ${c.strategy!.targetChannel}.`
      );
    } else {
      const dir = ev.influence === 'calibrated-down' ? 'dampened' : 'raised';
      out.push(
        `Case ${c.caseId} (${label}): AI predicted ${ev.rawProbability.toFixed(0)}%, history (${ev.similarCases} similar cases at ${ev.historicalSuccessRatePct.toFixed(0)}%) → probability adjusted to ${ev.adjustedProbability.toFixed(0)}% (${dir}).`
      );
    }
  }
  return out;
}

export function getLearningMetrics(outcomes: RecoveryLearningOutcome[]): LearningMetrics {
  if (outcomes.length === 0) {
    return {
      casesLearnedFrom: 0,
      predictionAccuracyPct: 0,
      falsePositives: 0,
      falseNegatives: 0,
      avgPredictedPct: 0,
      calibration: [],
      channelEffectiveness: [],
      correctedExamples: [],
      mintedAt: new Date().toISOString()
    };
  }

  const correctCount = outcomes.filter(o =>
    (o.predictedProbability >= 0.5 && o.actualOutcome === 'SUCCESS') ||
    (o.predictedProbability < 0.5 && o.actualOutcome === 'FAILURE')
  ).length;

  const falsePositives = outcomes.filter(o => o.predictedProbability >= 0.65 && o.actualOutcome === 'FAILURE').length;
  const falseNegatives = outcomes.filter(o => o.predictedProbability <= 0.40 && o.actualOutcome === 'SUCCESS').length;

  const avgPredictedPct = Math.round((outcomes.reduce((sum, o) => sum + o.predictedProbability, 0) / outcomes.length) * 100);

  const bucketDefs: { label: string; min: number; max: number }[] = [
    { label: '0–33%', min: 0, max: 33 },
    { label: '34–66%', min: 34, max: 66 },
    { label: '67%+', min: 67, max: 100 }
  ];
  const calibration: CalibrationBucket[] = [];
  for (const b of bucketDefs) {
    const inBucket = outcomes.filter(o => {
      const pct = o.predictedProbability * 100;
      return b.label === '67%+' ? pct >= 67 : pct >= b.min && pct <= b.max;
    });
    if (inBucket.length === 0) continue;
    const successCount = inBucket.filter(o => o.actualOutcome === 'SUCCESS').length;
    calibration.push({
      bucket: b.label,
      count: inBucket.length,
      avgPredictedPct: Math.round((inBucket.reduce((s, o) => s + o.predictedProbability, 0) / inBucket.length) * 100),
      actualSuccessPct: Math.round((successCount / inBucket.length) * 10000) / 100
    });
  }

  return {
    casesLearnedFrom: outcomes.length,
    predictionAccuracyPct: Math.round((correctCount / outcomes.length) * 10000) / 100,
    falsePositives,
    falseNegatives,
    avgPredictedPct,
    calibration,
    channelEffectiveness: channelStats(outcomes),
    correctedExamples: buildCorrectedExamples(outcomes),
    mintedAt: new Date().toISOString()
  };
}