// nerva-v11-gate.js — NERVA v11.1 escalation gate: bounded ESCALATE with
// unreachable-operator fallback. Plain JS, no dependencies. Loads in a browser
// (window.NervaGate) or in node (module.exports). Mirrors
// Nerva_Prompt_Universal/nerva_gate.py line for line; keep the two in step.
//
// Design rules (spec §2): default is stillness, never approval; ESCALATE is
// never silently downgraded; waits are bounded; the gate never invents a safe
// behavior; TOXIC never releases without an operator; a retry is a bandwidth
// spend and is counted as one.
//
// The gate is per proposed action: one Gate per action episode, step() once
// per scoring tick with the kernel's verdict. Time is supplied by the caller.
//
// Starpoint LLC

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NervaGate = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STATES = ['COMMIT', 'HOLD', 'WAIT', 'ESCALATE_PENDING', 'FALLBACK_HOLD', 'TOXIC_LATCHED'];
  const REASONS = ['uncertainty', 'emergency_irreversible', 'low_confidence_foundation'];
  const IRREVERSIBLE_REASONS = new Set(['emergency_irreversible', 'low_confidence_foundation']);
  const DEFAULT_ESCALATION_VERDICTS = new Set(['ESCALATE', 'CONSULT']);

  // Spec §8: provisional, hand-set, to be calibrated.
  const DEFAULT_PARAMS = Object.freeze({
    T_esc: 5.0,            // s, first escalation timeout
    N_retry: 3,            // retries before fallback
    backoff_factor: 2.0,   // each retry waits backoff_factor × longer
    delta: 0.08,           // release margin above the bar (v11 value)
    k: 20,                 // consecutive ticks above bar + delta (2.0 s at 10 Hz)
  });

  function totalBoundedWait(p) {
    let s = 0;
    for (let i = 0; i <= p.N_retry; i++) s += Math.pow(p.backoff_factor, i);
    return p.T_esc * s;
  }

  // ── Release rule (the existing v11 rule, reused for FALLBACK_HOLD → COMMIT)
  class ReleaseRule {
    constructor(delta, k) { this.delta = delta; this.k = k; this.dwell = 0; }
    reset() { this.dwell = 0; }
    update(signal, bar) {
      if (signal == null || bar == null) { this.dwell = 0; return false; }
      if (signal >= bar + this.delta) this.dwell += 1; else this.dwell = 0;
      return this.dwell >= this.k;
    }
  }

  // ── fnv-1a over the canonical JSON of the receipt (short, deterministic)
  function receiptHash(obj) {
    const keys = Object.keys(obj).filter(k => k !== 'receipt_hash').sort();
    const s = JSON.stringify(obj, keys);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  class Gate {
    constructor(opts = {}) {
      this.safeAction = opts.safeAction || null;
      this.p = Object.assign({}, DEFAULT_PARAMS, opts.params || {});
      this.escalationVerdicts = new Set(opts.escalationVerdicts || DEFAULT_ESCALATION_VERDICTS);
      this.release = new ReleaseRule(this.p.delta, this.p.k);
      this.tick = 0;
      this.state = null;
      this.operatorReachable = null;   // null = unknown
      this.escalatedAt = null;
      this.escalationReason = null;
      this.timeoutS = null;
      this.nextRetryAt = null;
      this.retries = 0;
      this.fallbackInvoked = false;
      this.safeActionId = null;
      this.commsEvents = 0;
      this.receipts = [];
    }

    _enterPending(t, reason, fresh) {
      if (fresh && !REASONS.includes(reason)) throw new Error(`escalation_reason must be one of ${REASONS.join('|')}, got ${reason}`);
      this.state = 'ESCALATE_PENDING';
      if (fresh) {
        this.escalatedAt = t;
        this.escalationReason = reason;
        this.fallbackInvoked = false;
        this.safeActionId = null;
      }
      this.retries = 0;
      this.timeoutS = this.p.T_esc;
      this.nextRetryAt = t + this.timeoutS;
      this.commsEvents += 1;            // the signal itself is a comms event
      this.release.reset();
    }

    _enterFallback() {
      this.state = 'FALLBACK_HOLD';
      this.fallbackInvoked = true;
      this.timeoutS = null;
      this.nextRetryAt = null;
      this.release.reset();
      this.safeActionId = this.safeAction ? String(this.safeAction()) : 'none';
    }

    _clearEscalation() {
      this.escalatedAt = null; this.escalationReason = null;
      this.timeoutS = null; this.nextRetryAt = null; this.retries = 0;
      this.fallbackInvoked = false; this.safeActionId = null;
      this.release.reset();
    }

    /**
     * Advance one tick.
     * @param verdict kernel verdict this tick
     * @param o {t, reason, signal, bar, operatorReachable, operatorResponse}
     *   reason: required the tick an escalation verdict first arrives
     *   signal/bar: kernel |r| and τ, for the evidence release rule
     *   operatorReachable: link status if known this tick
     *   operatorResponse: 'commit' | 'wait' | 'release'
     */
    step(verdict, o) {
      const t = o.t;
      this.tick += 1;
      let releasedBy = 'none';
      let dwellAtRelease = null;

      const prevReachable = this.operatorReachable;
      if (o.operatorReachable != null) this.operatorReachable = o.operatorReachable;
      const linkReturned = prevReachable === false && this.operatorReachable === true;

      // TOXIC: any → latched; operator-only release; no timeout, no fallback
      if (verdict === 'TOXIC' && this.state !== 'TOXIC_LATCHED') {
        this.state = 'TOXIC_LATCHED';
        this._clearEscalation();
      } else if (this.state === 'TOXIC_LATCHED') {
        if (o.operatorResponse === 'release' && verdict !== 'TOXIC') {
          releasedBy = 'operator';
          this.state = null;
        }
      }

      if (this.state !== 'TOXIC_LATCHED') {
        if (this.state === null || this.state === 'COMMIT' || this.state === 'HOLD' || this.state === 'WAIT') {
          if (this.escalationVerdicts.has(verdict)) this._enterPending(t, o.reason, true);
          else this.state = verdict;
        }

        if (this.state === 'ESCALATE_PENDING') {
          if (o.operatorResponse === 'commit' || o.operatorResponse === 'wait') {
            this.state = o.operatorResponse === 'commit' ? 'COMMIT' : 'WAIT';
            releasedBy = 'operator';
            this._clearEscalation();
          } else if (this.operatorReachable === false) {
            this._enterFallback();
          } else if (this.nextRetryAt != null && t >= this.nextRetryAt) {
            if (this.retries < this.p.N_retry) {
              this.retries += 1;
              this.commsEvents += 1;
              this.timeoutS = this.p.T_esc * Math.pow(this.p.backoff_factor, this.retries);
              this.nextRetryAt = t + this.timeoutS;
            } else {
              this._enterFallback();
            }
          }
        } else if (this.state === 'FALLBACK_HOLD') {
          if (o.operatorResponse === 'commit' || o.operatorResponse === 'wait') {
            this.state = o.operatorResponse === 'commit' ? 'COMMIT' : 'WAIT';
            releasedBy = 'operator';
            this._clearEscalation();
          } else if (linkReturned) {
            this._enterPending(t, null, false);
          } else if (this.escalationReason === 'uncertainty') {
            const recovered = this.release.update(o.signal, o.bar);
            // the kernel must not itself still be demanding a human
            if (recovered && !this.escalationVerdicts.has(verdict)) {
              dwellAtRelease = this.release.dwell;
              this.state = 'COMMIT';
              releasedBy = 'evidence';
              this._clearEscalation();
            }
          } else {
            this.release.reset();   // irreversible reasons: evidence cannot release
          }
        }
      }

      const rec = {
        tick: this.tick, t, verdict_in: verdict, state: this.state,
        action_allowed: this.state === 'COMMIT',
        escalated_at: this.escalatedAt,
        escalation_reason: this.escalationReason,
        operator_reachable: this.operatorReachable,
        timeout_s: this.timeoutS,
        retries: this.retries,
        backoff_factor: this.p.backoff_factor,
        fallback_invoked: this.fallbackInvoked,
        safe_action_id: this.safeActionId,
        released_by: releasedBy,
        dwell_ticks_at_release: dwellAtRelease,
        comms_events: this.commsEvents,
      };
      rec.receipt_hash = receiptHash(rec);
      this.receipts.push(rec);
      return rec;
    }
  }

  /**
   * Map v11 kernel flags (from evaluate().flags) to an escalation reason.
   *   emergency_override    → emergency_irreversible
   *   low_confidence_brake  → low_confidence_foundation
   *   one_way_brake (weak integrity, full confidence)
   *                         → low_confidence_foundation
   * The last mapping is a v11.1 decision flagged for review: the spec lists
   * three reasons and the plain One-Way Brake (irreversible + weak integrity
   * foundation) is not named. It is irreversible, so it belongs with the
   * reasons evidence cannot release, and its v11 reason text is "incomplete
   * integrity foundation".
   */
  function escalationReasonFromFlags(flags) {
    if (!flags) return null;
    if (flags.emergency_override) return 'emergency_irreversible';
    if (flags.low_confidence_brake) return 'low_confidence_foundation';
    if (flags.one_way_brake) return 'low_confidence_foundation';
    return null;
  }

  /** Feed a v11 evaluate() result straight into a Gate. */
  function stepFromV11(gate, result, o) {
    return gate.step(result.decision, Object.assign({
      reason: escalationReasonFromFlags(result.flags),
      signal: result.bloch.magnitude,
      bar: result.tau,
    }, o));
  }

  return { Gate, ReleaseRule, STATES, REASONS, IRREVERSIBLE_REASONS, DEFAULT_PARAMS,
           DEFAULT_ESCALATION_VERDICTS, totalBoundedWait, escalationReasonFromFlags, stepFromV11, receiptHash };
});
