# NERVA v11.1 — Unreachable-escalation fallback and risk-sign correction

Status: implementation spec for branch `v11.1-fallback`. Starpoint LLC.
Scope: the kit kernel (`Nerva_Prompt_Universal/nerva_kernel.py`), the v11 kernel (`nerva-v10/nerva-v11-core.jsx`, the canonical v11 kernel; there is no separate TypeScript kernel in the repo), the DiMOS gate (private repo), and the drone-sim harness. No UI work. No new inputs. No forecasting.

Section 6 was amended in review on 2026-11-07 (two changes, marked below). The verdict diff tool `tools/v111-verdict-diff.mjs` implements the amended section 6 and reproduces its wording in every report.

## 1. Problem

ESCALATE assumes an operator will answer. In a degraded-comms mission there may be no operator reachable for the whole run. Today the gate's behavior after an unanswered ESCALATE is undefined: the DiMOS gate holds, but nothing bounds the hold, nothing retries, nothing invokes a safe local behavior, and the receipt does not record that escalation failed. A gate that can be left waiting forever by one lost link is not deployable in the setting it is meant for.

A second defect blocks calibration and must be fixed in the same release. In the v11 kernel, Risk (R) adds to the signal magnitude, and confidence shrinkage scales the whole signal. Lowering Risk's confidence therefore shrinks the case for acting, which is conservative by accident. Once Risk is corrected to count against acting, the same shrinkage would pull a dangerous reading toward neutral and make it look safer. Calibrating against that would fit the error.

## 2. Design rules

1. The default is stillness, never approval. No path turns an unanswered ESCALATE into COMMIT.
2. ESCALATE is never silently downgraded. Every fallback is recorded as a fallback.
3. Waits are bounded. Every hold has a timeout and a retry schedule.
4. The gate never invents a safe behavior. The integrator supplies one; absent one, the gate holds.
5. TOXIC never releases without an operator. Unchanged.
6. Confidence shrinks the case for acting, never the case against it. Uncertain risk is treated as higher risk.
7. Comms by exception: a retry is a bandwidth spend and is counted as one.

## 3. State machine

States: `COMMIT`, `HOLD`, `WAIT`, `ESCALATE_PENDING`, `FALLBACK_HOLD`, `TOXIC_LATCHED`.

Transitions:

- Any → `ESCALATE_PENDING` when the kernel returns ESCALATE. Record `escalated_at` and `escalation_reason` (one of `uncertainty`, `emergency_irreversible`, `low_confidence_foundation`).
- `ESCALATE_PENDING` → `COMMIT` or `WAIT` on operator response, as the operator directs. Record `released_by = operator`.
- `ESCALATE_PENDING` → `ESCALATE_PENDING` on retry: after `T_esc` with no response, re-signal, increment `retries`, back off by `backoff_factor`, up to `N_retry`.
- `ESCALATE_PENDING` → `FALLBACK_HOLD` after `N_retry` unanswered retries, or immediately if `operator_reachable = false` is known. Record `fallback_invoked = true`.
- `FALLBACK_HOLD`: invoke the integrator's `safe_action()` if supplied (station-keep, loiter, retreat to last known safe point, power down; the gate does not choose). Hold the proposed action. Keep scoring every tick.
- `FALLBACK_HOLD` → `COMMIT` only when `escalation_reason = uncertainty` and the evidence recovers: signal ≥ Θ + δ for k consecutive ticks (the existing release rule). Record `released_by = evidence`.
- `FALLBACK_HOLD` stays `FALLBACK_HOLD` when `escalation_reason = emergency_irreversible` or `low_confidence_foundation`. Evidence alone cannot release an irreversible action that needed a human. Record `released_by = none`.
- `FALLBACK_HOLD` → `ESCALATE_PENDING` when the link returns (`operator_reachable` flips true). Resume the retry schedule from zero.
- `TOXIC_LATCHED`: operator-only release. No timeout. No fallback path. Unchanged from v11.

Retries are counted as comms events for the harness's bandwidth metric.

## 4. Safe-behavior interface

`safe_action()` is supplied by the integrator at gate construction. It returns an action id and nothing else; the gate logs it and hands it to the actuator path. If no `safe_action` is supplied, `FALLBACK_HOLD` holds and emits a receipt line `safe_action = none`. The gate never synthesizes a motion.

## 5. Receipt fields added

`escalated_at`, `escalation_reason`, `operator_reachable`, `timeout_s`, `retries`, `backoff_factor`, `fallback_invoked`, `safe_action_id`, `released_by` (`operator` | `evidence` | `none`), `dwell_ticks_at_release`, `comms_events`.

## 6. Risk-sign correction (v11 kernel)

Current: `r_y = R / √3`, and `r_mixed = C · r_pure` scales all three components. Risk raises the case for acting.

Change:

1. Risk no longer contributes to the signal magnitude. `r_y` is removed from the case-for computation; the Bloch vector becomes `(r_x, 0, r_z)` with the same √3 normalization, so `|r| ≤ 1` still holds (verify: all-ones input gives |r| = √(1/3 + 1/3) < 1; document the new ceiling).
2. Risk enters only through the bar and the guards, where it already appears. Define an effective risk:

   `R_eff = 1 − c_R · (1 − R)`

   where `c_R` is Risk's confidence in [0,1]. At full confidence `R_eff = R`. At zero confidence `R_eff = 1`. Uncertain risk is treated as maximum risk. `R_eff` replaces `R` in τ and in the EV block.

   *Amended in review.* The TOXIC veto keeps the raw `R`. TOXIC means actual low integrity with actual high risk. With `R_eff` in the veto, low Risk confidence turned an unknown reading into a permanent operator-only latch; in a silent-stadium mission that is a dead unit for an input that was merely unknown. Uncertain-and-irreversible lands in ESCALATE with the fallback path, which is the behavior this release exists to provide.
3. Confidence shrinkage `C` is computed from the four case-for inputs only (E, S, Sp, St). Risk's confidence acts through `R_eff`, never through `C`.

Pre-registered expectation (*amended in review*): under this change, no verdict becomes less conservative than it was for the same inputs. *Permissive* means any transition toward COMMIT, any drop in τ, or any rise in EV, whether or not the verdict changed. A HOLD ↔ WAIT reclassification below threshold is listed but not counted: neither verdict permits action. Run the golden-value set and the drone-sim scenario set under old and new kernels; list every verdict that changes; any permissive change fails the release.

## 7. Tests

Unit: every transition in section 3; timeout and retry counting; `safe_action` absent and present; TOXIC never releases; evidence release only on `uncertainty`; link-return resumes retries.

Replay, drone harness, same seeds as the September series:
- Silent stadium: operator unreachable for the full run, evidence recovers at tick t. Expect `FALLBACK_HOLD` then `COMMIT` with `released_by = evidence`, dwell recorded.
- Silent stadium, no recovery: remains `FALLBACK_HOLD` to end of run. No COMMIT.
- Emergency irreversible, unreachable: `FALLBACK_HOLD` with `safe_action` invoked, never auto-released.
- Link flap: operator reachable intermittently. Expect bounded retries, no thrash, comms events counted.
- Non-escalation paths: verdict flip counts unchanged from v11 within tolerance (this release must not alter hysteresis behavior elsewhere).

Regression: golden values for the Risk correction as in section 6.

## 8. Parameters (provisional, hand-set, to be calibrated)

`T_esc = 5 s` sim time · `N_retry = 3` · `backoff_factor = 2` · δ and k unchanged from v11 · `c_R` from the existing data-quality tier mapping until calibration replaces it.

## 9. Out of scope

Forecast-as-evidence (v12 branch). New inputs. Per-input hysteresis (v12 candidate). Any UI. Any change to TOXIC semantics.

## 10. Done when

All section-7 tests pass; the section-6 verdict diff is produced and every change is conservative; receipts carry the section-5 fields; the harness bandwidth metric counts retries; the spec's parameter table is reproduced in the README as provisional. Branch stays unmerged until the verdict diff has been reviewed by a person.
