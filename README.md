# NERVA v10 · Decision Integrity Platform

**A runtime decision-gating layer for AI agentic systems and human operators.**

NERVA sits between reasoning and high-stakes action. Returns one of five structured verdicts — **COMMIT · HOLD · WAIT · CONSULT · TOXIC** — against five published axes, with full provenance. Every gated decision is written to an auditable ledger.

This repo is the live cockpit platform. The current primary surface is **NERVA v11 · Mixed-State Decision Integrity Cockpit** — the instrument that exposes the full audit cluster and serves as the operational deployment for high-stakes governance.

→ Summary (phone-friendly): [nerva-v10.vercel.app](https://nerva-v10.vercel.app)
→ Cockpit platform: [nerva-v10.vercel.app/cockpit.html](https://nerva-v10.vercel.app/cockpit.html)
→ Primary instrument: [nerva-v10.vercel.app/v11.html](https://nerva-v10.vercel.app/v11.html)

---

## What it is

The NERVA platform is the operator-facing surface for the decision-gating kernel. Built for two distinct buyers:

- **AI infrastructure teams** deploying agentic systems where decisions need to be gated before action — the cockpit sits one layer above operational observability and writes a separate decision-integrity trace
- **Human operators** running high-stakes decisions (capital allocation, vendor selection, hiring, strategy commitments) who want a structured brake with provenance

The cockpit is the visualization. The kernel is the math. The ledger is the memory. The discipline is the product.

---

## NERVA v11 · The primary cockpit

**v11 is the working prototype.** The earlier view modes (A through D) shipped during the development of the kernel's visual vocabulary; v11 is what the platform was building toward and is the surface that should be evaluated when assessing NERVA as a governance instrument.

### What v11 adds

v11 is the **mixed-state cockpit** — the full implementation of the Bloch-vector representation, the von Neumann entropy calculation, and the adaptive threshold logic, surfaced through an operator-facing instrument cluster.

The cluster exposes five sub-panels in Audit mode:

| Panel | What it surfaces |
|---|---|
| `<QLT>` Quality Metrics | Purity, entropy, margin, brake gap, reversibility, homogeneity — six kernel diagnostics, all computable from the values the kernel already produces |
| `<MAP>` Phase Map | The (C, clarity) coordinate plotted against the four non-TOXIC verdict regions — instant visual read of where the decision sits in state space |
| `<FAC>` Factors | Signed bars showing cᵢ − 0.5 for each axis — makes the structural shape of the verdict legible at a glance |
| `<SEN>` Sensitivity | Perturbation analysis: how much a +0.1 change to each axis moves aggregate confidence, and whether the verdict flips — names the binding constraint and the operational lever |
| `<LOG>` Agent Log | Execution trace of the kernel's eight-step pipeline — parse, extract, brake check, Bloch projection, compute, verdict, audit, route |

### What v11 supports

- **Summary / Audit mode toggle** — daily-use view collapses to the verdict, metrics, and reasoning; audit view exposes the full instrument cluster for high-stakes deliberation
- **The One-Way Brake** — high-stakes irreversible decisions with insufficient margin are routed to WAIT regardless of other conditions, with the brake state surfaced on the masthead
- **TOXIC refusal** — five published refuse categories (non-consenting third-party harm, undisclosed MNPI, decisions made for others who should be making them themselves, active-crisis signals, deceptive theses) — NERVA returns no verdict for these
- **Receipt provenance** — every scored decision produces a hashed receipt with a unique hash for ledger ingestion

### Why v11 over the other modes

The four earlier modes share the same kernel but expose different visual surfaces. They remain available on the platform for design reference and for users who prefer the stripped or alternative readouts. **v11 is the surface the kernel was designed to fully express, and is the surface a pilot deployment would run.**

---

## The full platform surface

| Mode | Status | What it shows |
|---|---|---|
| **v11 · Mixed-State Cockpit** | Prototype | Full instrument cluster, Summary/Audit toggle, primary deployment surface |
| **A · Cockpit** | Reference | Original verdict card layout — masthead, verdict word, metrics, Bloch projection, reasoning, provenance |
| **B · Terminal** | Reference | Monospace operator view for keyboard-driven decision intake |
| **C · Phase Space** | Reference | Phase-map visualization isolated from full card chrome |
| **D · Brutalist** | Reference | Stripped instrument-readout for high-density display environments |

All modes run the same NERVA kernel. The math does not change between views.

---

## Applications running on the platform

- **[Plumb](https://nerva-v10.vercel.app/plumb.html)** — three-layer buyside audit for media investment. Scores Optimization, Authenticity, and Pricing independently. Designed to catch the ad buy that looks great on distribution metrics and fails on cultural authenticity. Runs the NERVA kernel against media-domain-specific axis weights.

- **[Data Field](https://nerva-v10.vercel.app/data-field.html)** — operator data view for live decision feeds. Demonstrates how the platform handles streaming decision intake at scale.

---

## The kernel

The NERVA kernel maps decisions onto a Bloch vector representation and computes confidence as a mixed-state purity measure. Five axes with default weights:

```
c_evidence        × 0.30
c_differentiation × 0.25
c_falsifiability  × 0.20
c_timing          × 0.15
c_alignment       × 0.10
```

Aggregate confidence `C = Σ wᵢcᵢ`. Density matrix `ρ = ½(I + r_eff · σ)`. Von Neumann entropy `S(ρ)` measures the spread between directional conviction and evidence structure. Adaptive threshold `τ = τ₀ + α·S + β·σ_stakes + γ·irreversibility` scales with stakes and reversibility.

A decision clears the threshold when `C ≥ τ`. Verdict state is then determined by entropy (COMMIT vs HOLD), brake conditions (the One-Way Brake on high-stakes irreversible commits), and TOXIC refusal categories.

The math is published in full. The reference implementation lives at [CaptainMig/Nerva_Prompt_Universal](https://github.com/CaptainMig/Nerva_Prompt_Universal) and runs deterministically in Python for verification when the verdict matters.

---

## v11.1 · unreachable-escalation fallback and risk-sign correction

Branch `v11.1-fallback`, unmerged until the verdict diff has been reviewed by a person. The spec is at `docs/NERVA-v11.1-spec.md`, with section 6 as amended in review; the diff tool implements that section.

**What changes.** Two things, in the same release.

1. **Escalation gate.** ESCALATE used to assume an operator would answer. The gate now bounds the wait: it re-signals on a backoff schedule, falls back to a hold when the operator is unreachable, invokes the integrator's safe behavior if one was supplied, and records all of it on the receipt. No path turns an unanswered ESCALATE into COMMIT. TOXIC still releases only to an operator. Reference implementation: `nerva-v11-gate.js` here (browser or node), mirrored by `nerva_gate.py` in Nerva_Prompt_Universal.
2. **Risk-sign correction** in `nerva-v11-core.jsx`, which is the canonical v11 kernel (there is no separate TypeScript kernel in this repo). Risk no longer adds to the signal magnitude: the Bloch vector is (r_x, 0, r_z), so |r| ≤ √(2/3) ≈ 0.8165. Risk enters only through the bar and the guards. Effective risk R_eff = 1 − c_R·(1 − R) replaces R in τ and in the EV block, so uncertain risk reads as higher risk where that belongs. The TOXIC veto keeps the raw R: TOXIC means actual low integrity with actual high risk, and an uncertain risk reading on an irreversible action lands in ESCALATE with the fallback path, not in an operator-only latch. Confidence shrinkage C comes from E, S, Sp, St only (weights renormalized to sum to 1); Risk's confidence acts through R_eff, never through C.

**Gate states.** `COMMIT · HOLD · WAIT · ESCALATE_PENDING · FALLBACK_HOLD · TOXIC_LATCHED`. Escalation reasons: `uncertainty`, `emergency_irreversible`, `low_confidence_foundation`. Only `uncertainty` can be released by evidence (signal ≥ Θ + δ for k consecutive ticks); the other two wait for a human. Receipts carry `escalated_at, escalation_reason, operator_reachable, timeout_s, retries, backoff_factor, fallback_invoked, safe_action_id, released_by, dwell_ticks_at_release, comms_events`. Every signal and retry counts as a comms event for the bandwidth metric.

**Parameters (provisional, hand-set, to be calibrated).**

| Parameter | Value | Note |
|---|---|---|
| `T_esc` | 5 s sim time | first escalation timeout |
| `N_retry` | 3 | retries before fallback |
| `backoff_factor` | 2 | each retry waits twice as long |
| δ | 0.08 | release margin above the bar, unchanged from v11 |
| k | 20 ticks (2.0 s at 10 Hz) | dwell above bar + δ, unchanged from v11 |
| `c_R` | data-quality tier mapping | until calibration replaces it |

With these values an escalation with the link status unknown reaches FALLBACK_HOLD 75 s after it was raised (5 + 10 + 20 + 40). A known-unreachable operator falls back at once.

**Run the checks.**

```bash
node --test 'tests/*.test.mjs'
```

```bash
node tools/v111-verdict-diff.mjs --base main
```

The diff runs the v11 kernel at `main` and the working-tree kernel over the six presets and five history seeds, every tick of `replay.html`'s replay (`tools/replay-frames.json`, from `tools/extract-replay-frames.mjs`), and a 20,000-input seeded sweep, and writes `tools/v111-verdict-diff.md`. It exits non-zero on any permissive change.

**Pre-registered expectation (spec §6, as amended in review).** No verdict becomes less conservative for the same inputs. *Permissive* means any transition toward COMMIT, any drop in τ, or any rise in EV, whether or not the verdict changed. A HOLD ↔ WAIT reclassification below threshold is listed but not counted: neither verdict permits action. Result on this branch: PASS, 0 permissive across 20,672 inputs; 255 named conservative changes (COMMIT → HOLD/WAIT); 184 HOLD ↔ WAIT reclassifications; no transition into ESCALATE or TOXIC.

**Decisions taken in review.**

- The plain One-Way Brake (irreversible with weak integrity) is not named among the three escalation reasons. It is mapped to `low_confidence_foundation`, so evidence cannot release it. See `escalationReasonFromFlags`. Kept.
- Evidence release from FALLBACK_HOLD also requires that the kernel is no longer demanding a human on the release tick. Kept.
- The TOXIC veto uses the raw R, not R_eff. An earlier draft used R_eff there, which turned low Risk confidence into a permanent operator-only latch; in a silent-stadium mission that is a dead unit for an input that was merely unknown. Changed.

- Below threshold, HOLD versus WAIT is split on C ≥ 0.5. Because c_R no longer enters C, some inputs with low Risk confidence move from WAIT to HOLD, and others the other way. Neither allows action, so these are reclassifications, listed in the diff and not counted. The report's appendix keeps the alternative normalization for reference. Kernel side closed.

**Open.**

- `replay.html` carries its own copy of the v11 math and is a labeled illustration; it was not changed.
- The DiMOS gate and the drone-sim harness live outside this repository. The September-series replays were not run here; the gate tests use synthetic stand-ins for the same scenarios. The branch is review-ready, not merge-ready, until those replays run against the DiMOS gate.

**First item for v11.2.** The kernel's `low_confidence_brake` flag cannot fire: reversibility < 0.4 implies Sp·St < 0.16 < BRAKE_I, so an irreversible input always trips the One-Way Brake first. The guard meant to catch "irreversible on guessed inputs" has been dead code since July, and that capability is currently enforced by a different guard than the one named for it. It is a one-line ordering or condition fix; it was left alone in this release because kernel constants and guard order were out of scope.

---

## Two deployment paths

**Cockpit platform (this repo)** — operator-facing visualization for human decision workflows. Static HTML, no server, browser-local state. Suitable for personal use, pilot deployments, and demonstration of the methodology.

**Agentic runtime layer (in pilot scoping)** — SDK and API for AI agentic systems where decisions need to be gated programmatically before action commits. NERVA sits between agent reasoning and the action layer, scores the agent's stated reasoning structure against the same five axes, and routes by verdict state. COMMIT decisions flow normally; HOLD, CONSULT, and TOXIC are routed to operator review or refused. Every gated decision is written to a decision-integrity audit ledger separate from operational telemetry.

The cockpit is what you can see today. v11 is the surface that demonstrates what the runtime layer enforces programmatically. The runtime layer is what enterprises buy.

---

## What this is not

NERVA does not predict outcomes. NERVA evaluates the structural integrity of stated reasoning before commitment. The kernel scores *claims*, not *credentials*; *structure*, not *narrative*.

The lift score — the empirical hit-rate of decisions that followed NERVA versus decisions that overrode it — is computed only from resolved outcomes in the ledger. It is never extrapolated forward. The willingness to be falsified is the product.

---

## Status

- **v11 cockpit:** Working prototype, deployed, primary surface
- **Reference modes A–D:** Stable, available for design reference
- **Plumb application:** Deployed, pilot proposal v1.0 published
- **Reference kernel (Python):** Deterministic implementation available in companion repo
- **Agentic runtime layer:** In pilot scoping, not yet generally available
- **Pilot inquiries:** Welcome — see Starpoint LLC contact below

---

## Built by

[Starpoint LLC](https://www.linkedin.com/in/amigliazzo/) · Solo technical founder building a decision-integrity layer for AI agentic systems and human operators.

**Related repos:**
- [Nerva_Prompt_Universal](https://github.com/CaptainMig/Nerva_Prompt_Universal) — portable methodology kit, reference kernel, audit ledger
- [NERVA_Agentic_Shopping_Assistant](https://github.com/CaptainMig/NERVA_Agentic_Shopping_Assistant) — NERVA layered into agentic commerce
- [plumb](https://github.com/CaptainMig/plumb) — three-layer buyside audit pilot proposal

---

*NERVA v10 platform · v11 primary instrument · Starpoint LLC*
