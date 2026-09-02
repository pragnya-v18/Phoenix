# RecoverFlow AI — Demo Scripts & Judge Briefing

_RecoverFlow AI (Razorpay AI Buildathon 2026, Track 03: recovery & reconciliation)._
_All figures below are live numbers reproduced from the clean seeded demo instance (9 cases), so they are honest and reproducible in front of a judge._

**Live instance numbers (from `/api/analytics/kpis` + `/api/simulate/benchmark` on a fresh seed):**
- 9 cases · 6 recovered · 3 active
- Revenue at risk: **₹7,12,494**
- Verified recovered: **₹2,06,523** · Projected recovered: **₹34,247** · Net saved: **₹2,35,190**
- Recovery rate: **33.8%** · ROI factor: **42.1×**
- Benchmark (3 open cases): naive baseline net **₹46,957** → static rules engine **₹1,05,798** → AI agent **₹2,89,246** = **+173.4% over rules, +516% over naive**; 1 high-value case auto-held for human approval (₹48,500 > ₹25,000 limit)
- Recovery Intelligence: **5 seed-derived outcomes** bootstrapped on first load (accuracy: 100%); panel updates live as cases resolve (6s refresh); `GET /api/learning/evidence` returns global metrics, calibration buckets, channel effectiveness, and evidence examples

---

## 60-Second Script (Pitch)

> "RecoverFlow AI is an intelligent revenue-recovery and reconciliation layer for Razorpay. When a payment fails, currently you send a blind retry or a generic reminder — and you often double-charge a customer who already paid, or waste effort chasing a ₹500 payment.
>
> RecoverFlow diagnoses the real reason a payment failed, then runs a financial EV optimizer to decide **whether** to chase, **when**, and via **which channel**. It computes the exact expected-value of each recovery attempt: cost of incentive, MDR, ops, and contact-strategy — and only acts where the economics are clearly positive.
>
> Two things make us different from a 'smart reminder' bot:
> **1. Double-Charge Guardrail.** Before any attempt, we call the Razorpay API to verify the original payment's status. If it already settled, we block the action before it can double-charge — you can see this settlement verdict attached to each case.
> **2. Verified vs. Projected Revenue.** We only count money that actually reached your account as 'verified'; recovery that's still in flight is shown separately as 'projected' — so the dashboard is audit-ready.
>
> We benchmark ourselves against a naive baseline AND a static rules engine with a deterministic engine. On this live instance, the same 3 cases recover **₹2.89L with RecoverFlow vs ₹47K with blind retry — a 516% uplift — and vs ₹1.05L with a plain rules engine — a 173% AI advantage.** Every time a case resolves, the engine learns — adjusting its probability estimate and channel recommendation for the next similar case."]
>
> — _Close with: "Every number you just saw is computed live on this screen."_

---

## 2-Minute Script (Full Walkthrough)

1. **Landing / Overview (0:00–0:25)** — Show the dashboard. Call out the KPI cards: ₹7.1L at risk, ₹2.06L **verified** recovered, ₹34K projected (still in flight), 33.8% recovery, 42× ROI. Point at the verified/projected **split bar** — "we never over-claim money that hasn't landed in your account." Note the **Recovery Intelligence** panel at the bottom right: prediction accuracy, channel success rates, and evidence examples — "the engine learns from every resolved case."

2. **Benchmark vs Baseline (0:25–0:45)** — Open the Benchmark panel, hit *Run Benchmark*. Explain the semantics: a naive system **blind-retries every failed payment**; a static rules engine applies the same rails but a fixed probability table; RecoverFlow's AI diagnoses, targets by EV, and holds risky cases. Show the jump: **₹46,957 → ₹1,05,798 → ₹2,89,246** — that's **+173% over the rules engine** and **+516% over naive**, with everything else held identical.

3. **Recovery Intelligence Feedback Loop (0:45–1:05)** — Scroll to the **Recovery Intelligence** panel. Show the Prediction Accuracy % (seed-derived: 100% from 5 initial cases), Channel Success Rates (WHATSAPP 100%, EMAIL 100%), and Confidence Calibration table. Open a resolved case's Decision Rationale → "Learning Evidence" section shows the **before/after** probability the engine used: "when ≥3 similar historical cases exist, the engine adjusts its estimate — no retraining, just arithmetic from real outcomes." Explain: as demo cases resolve in real-time, this panel updates and the next case's strategy is slightly better calibrated. The **self-corrections** list shows any false-positive/false-negative cases the engine caught.

4. **The Settlement Guard (1:05–1:25)** — Pick a case that already settled. Open its **decision rationale** and show the EV panel + the settlement verdict. Explain: "before we send anything, we call the Razorpay API. This one already settled — so we **blocked** the action and logged it as a prevented double-charge. This is why the naive baseline's held-list is empty but ours isn't."

5. **Human-in-the-loop (1:25–1:40)** — Show a ₹48.5K case that was auto-held because it exceeds the ₹25K auto-approval threshold. Emphasize: agent autonomy is capped by risk limits; humans approve big money.

6. **PII & Prompt Safety (1:40–1:50)** — Note that customer phone/email/CLV are masked before any LLM prompt — we don't leak PII to the model, and a prompt-injection attempt in the message is neutralized (there's a hardening test for exactly this).

7. **Close (1:50–2:00)** — "Production hardening: 51 automated tests covering the self-improving learning feedback loop, settlement reconciliation, idempotent webhooks, double-charge prevention, the AI-vs-rules ablation, and deterministic benchmarking; HMAC webhook verification; TS type-safe. Deployed as a single Node bundle. Questions welcome."

---

## Judge Q&A — Cheat Sheet

**Q: How do you prevent double-charging a customer who already paid?**
> Before any recovery action in the payment pipeline, we call `RazorpayService.checkOriginalPaymentStatus`. If the payment already settled (or is captured), we set the verdict `PAYMENT_ALREADY_SETTLED_BLOCKED_ACTION`, **block the dispatch**, log it in the audit trail, and surface a settlement-guard badge on the case. Reconciliation also runs on `payment_link.paid` / `payment_link.captured` webhooks via `handlePaymentLinkPaid`/`handlePaymentLinkCaptured`.

**Q: What is "verified" vs "projected" revenue?**
> Verified = money confirmed present in the merchant account (settlement-confirmed / captured). Projected = recovery our engine expects from in-flight attempts that hasn't settled yet. We keep them separate so revenue reporting is audit-ready and never overstates actual cash.

**Q: What makes your benchmark honest?**
> It's a **deterministic, offline** engine over the same case set — the naive baseline blindly retries every failed payment at T+24h with no diagnosis/targeting, a static **rules engine** applies a fixed probability table with the same compliance double-charge rails, and our agent applies diagnose → EV-optimize → compliance gate → dispatch-only-where-clear. All three are costed with the same incentive/MDR/ops model, so the +173% over rules and +516% over naive are apples-to-apples, and they reproduce byte-for-byte across runs (tests lock it).

**Q: Why is AI better than a rules engine?**
> The rules column here uses the SAME double-charge rails and the same cost model — the only thing that differs is the decision signal. A static table can't weight the customer's CLV, bank switch health, invoice aging and rail-switch recommendation together; a case where the UPI limit is the cause and the bank is healthy needs a different channel/incentive than a bank-outage case, and rules can't see that nuance. On this instance rules recover ₹1,05,798 net; the AI recovers ₹2,89,246 — a measured +173% for the AI's judgment, not for our expense model. The engine also learns from outcomes: after ≥3 similar resolved cases, it adjusts its recovery probability estimate toward the historical success rate and recommends a better channel — no retraining, just deterministic arithmetic.

**Q: How does the Recovery Intelligence Feedback Loop work?**
> Every terminal case (RECOVERED, FAILED, or DISMISSED with a strategy) stores its predicted recovery probability and actual outcome in the local store. When the next case lands in the same root-cause category and ≥3 similar historical cases exist, the engine blends the LLM's raw probability with the historical success rate (`adjusted = base + (histRate − base) × min(1, similar/20)`), clamped to [0.05, 0.97], and stamps the adjustment onto the strategy record. The same evidence can recommend switching channels if a rival channel has ≥10pp higher success with ≥3 attempts. The Compliance / Settlement Guard / EV optimizer all run AFTER the adjustment and are never weakened by it. Seed data provides 5 bootstrapped outcomes on first load so the panel is immediately populated.

**Q: How does the EV optimizer work?**
> For each case we compute expected recovery vs. the cost of trying: incentive, payment MDR, ops time, and channel/contact strategy. We only dispatch where the economics clear the threshold, and we pick the optimal net-present-value contact strategy and time. Results feed the decision-rationale panel so every action is explainable.

**Q: Why is a payment failed? How do you know the right channel?**
> Our diagnosis engine reasons over the event (UPI limit, bank outage, OTP timeout, invoice approval delay, etc.) and recommends a channel (payment link, UPI nudges, voice, email with incentives). For B2B/invoice cases there's a dedicated receivables path with aging buckets and promise-to-pay tracking.

**Q: What about duplicate concurrent runs on the same case?**
> Idempotency locks + a cooldown protect each case from concurrent duplicate executions, and webhook replay is idempotent (same event ID is skipped). The frontend also disables submit buttons while a request is in flight. Covered by tests.

**Q: Security?**
> Webhook signatures are verified with HMAC-SHA256 against `RAZORPAY_WEBHOOK_SECRET` (accept / reject / malformed all tested). PII (phone/email) is masked before any prompt goes to the model, and prompt-injection payloads are neutralized (tested). The Razorpay callback route HTML-escapes user input (no stored XSS).

**Q: Stack / deployability?**
> TypeScript end-to-end (Express backend + React 19/Vite 6/Tailwind v4) so types are shared. Builds to a single `dist/server.cjs` Node bundle, boots, and serves `/api/health` 200. Deterministic benchmark and all KPIs run offline — no live API key required for the demo.

**Q: Scalability / what's next (honest limit)?**
> In-memory store with Firestore optional — fine for a demo; a production version would move the engine to a durable store and add a reconciliation ledger. The `.promiseToPay` PTP-conversion metric currently reads a field the seeded schema doesn't populate (reports 0) — a known gap, not fabricated data. Those are the two honest limitations.
