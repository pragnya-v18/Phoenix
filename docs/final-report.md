# RecoverFlow AI — Buildathon Readiness Report

_Track 03 (AI Revenue Recovery) · Razorpay AI Buildathon 2026 · Final hardening pass._

## Readiness score: **94 / 100**

Justification below — strong on honesty, safety, reproducibility, and a live self-improving learning loop; docked for a small set of known tech-debt items that do not affect the demo.

---

## What is in place (verified this pass)

- **51 automated tests passing** (`tests/units.test.ts`, `tests/webhook.test.ts`, `tests/hardening.test.ts`, `tests/learning.test.ts`): learning feedback loop (record, probability adjustment, calibration, determinism), EV math, benchmark determinism + AI-vs-rules ablation, KPI verified/projected split, PII masking, prompt-injection hardening, webhook settlement-guard block, `payment_link.paid/captured` AUTO_SETTLED reconciliation, idempotent replay skip, cooldown duplicate-block, dead-letter unmatched payment links, HMAC accept/reject/malformed, duplicate-prevention.
- **`tsc --noEmit` clean** · **`npm run build` succeeds** (single `dist/server.cjs`) · **boots → `/api/health` 200** · **`/api/learning/evidence` returns metrics**.
- **Live reproducible numbers** (clean seed): ₹7,12,494 at risk → ₹2,40,770 recovered (33.8%), net ₹2,35,190, ROI 42.1×; benchmark naive ₹46,957 → rules ₹1,05,798 → AI ₹2,89,246 (**+173.4% over rules, +516% over naive**), stored-XSS check passes live.
- **Differentiators shipped & proven**: Double-Charge Guardrail (`checkOriginalPaymentStatus`), Verified vs Projected accounting, EV optimizer, deterministic Baseline Benchmark, human-in-the-loop holds, PII masking + injection defense, **Recovery Intelligence Feedback Loop** (self-improving probability adjustment + channel recommendations from historical outcomes).

## Audit fixes applied this pass

| Severity | Finding | Fix |
|---|---|---|
| Critical | Stored XSS in `/razorpay/callback` (unescaped `caseId`) | HTML-escape + 64-char cap — live-verified escaped |
| High | ACP dispatch double-submit (`isSending` hardcoded `false`) | Added `isSending` state + guard |
| High | Stale-closure in `sendNegotiation` reading pre-refresh cases | `refreshData` now returns fresh cases; caller uses them |
| Med | TopBar simulate items re-triggerable while busy | `disabled={isSimulating}` + visual state |
| Low | Dead imports (`ChannelType`, `CheckoutProfile`, `AuditLogEntry`) | Removed |

## Remaining risks / tech debt (honest)

1. **In-memory store** — `backend/repositories/db.ts` defaults to in-memory + disk (Firebase optional). Fine for demo; not horizontally scalable as-is.
2. **Recovery probability is an LLM estimate** — no calibrated/fitted model (intentionally declined XGBoost). EV/benchmark are projected expected values. The feedback loop adjusts this estimate using real outcome history (≥3 similar cases) but does not retrain the model itself.
3. **`.promiseToPay` gap** — `promiseToPayConversionRatePct` reads a field the seeded schema doesn't populate → reports **0**. Honest (not fabricated), but the metric is inert until the schema/pipeline sets it.
4. **`ExecutiveDashboard.timeRange` unused prop** — dead prop, harmless (minor tidy).
5. **No live Razorpay/Firebase keys** in the demo environment — settlement guard falls open (`unverified`, non-blocking) and KPIs use seed + simulator data. All marked PROJECTED, never verified, unless a real `payment.captured` webhook arrives.
6. **Benchmark "recovered" is expected value** from configured probability — labeled `model: "projected"`, not A/B production data.
7. **Learning loop cold-start** — on a fresh seed the store has only seed-derived outcomes (≥5 terminal seed cases); real-time learning improves as live demo cases resolve. The loop gracefully falls back to the raw LLM probability when <3 similar cases exist.

## Future improvements

- Wire the PTP metric to real promise-to-pay tracking across the invoice pipeline.
- Move to a durable store (Postgres/Firestore) + a formal reconciliation ledger with idempotent double-entry.
- Optional calibrated probability model (tsfresh/lgbm) behind the LLM estimate, with a held-out backtest log on `/api/simulate/benchmark`.
- Rate-limiter + dead-letter dashboard UI for the webhook DLQ (back-end already dead-letters).
- Remove `ExecutiveDashboard.timeRange` dead prop; add a lazy-load fracture in the polling hook.
- Expand the learning loop with channel-specific cost effectiveness (incentive-per-recovered-₹) and a "why it shifted" explainer per strategy recommendation.

## Submission checklist

- [x] `tsc --noEmit` clean
- [x] `npm test` → 51/51 pass (run twice, deterministic): `units.test.ts`, `webhook.test.ts`, `hardening.test.ts`, `learning.test.ts`
- [x] `npm run build` → `dist/server.cjs`
- [x] Boot smoke: `/api/health` 200; `/api/analytics/kpis`; `/api/simulate/benchmark`; `/api/learning/evidence` returns metrics
- [x] XSS escape verified live on `/api/razorpay/callback`
- [x] No fictional model names; `gemini-2.0-flash` only
- [x] Secrets check: only public Firebase web config in repo; data/dist/.env gitignored
- [x] Docs: `README.md` (honesty, architecture, data-flow, limitations, benchmark, learning loop) + `docs/demo-script.md` (60s / 2-min scripts + judge Q&A) + `docs/final-report.md`

_All changes remain uncommitted — not committed unless requested._
