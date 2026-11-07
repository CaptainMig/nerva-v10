// v11.1 escalation gate (spec §3, §7): node tests for nerva-v11-gate.js.
// Mirrors Nerva_Prompt_Universal/tests/test_gate.py.
// Run from the repo root:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGate, loadV11Core } from './load-v11-core.mjs';

const G = await loadGate();
const K = loadV11Core();
const DT = 0.1;
const REASONS = G.REASONS;

// ── transitions ─────────────────────────────────────────────────────────────

test('COMMIT/HOLD/WAIT pass through', () => {
  const g = new G.Gate();
  ['COMMIT', 'HOLD', 'WAIT', 'COMMIT'].forEach((v, i) => {
    const r = g.step(v, { t: i });
    assert.equal(r.state, v);
    assert.equal(r.action_allowed, v === 'COMMIT');
    assert.equal(r.comms_events, 0);
    assert.equal(r.released_by, 'none');
  });
});

test('reason required on a fresh escalation', () => {
  const g = new G.Gate();
  assert.throws(() => g.step('ESCALATE', { t: 0 }));
  assert.throws(() => g.step('ESCALATE', { t: 0, reason: 'made_up' }));
  assert.equal(g.state, null);
});

test('entering ESCALATE_PENDING records §5 fields', () => {
  const g = new G.Gate();
  const r = g.step('ESCALATE', { t: 12.5, reason: 'uncertainty' });
  assert.equal(r.state, 'ESCALATE_PENDING');
  assert.equal(r.escalated_at, 12.5);
  assert.equal(r.escalation_reason, 'uncertainty');
  assert.equal(r.timeout_s, 5);
  assert.equal(r.retries, 0);
  assert.equal(r.backoff_factor, 2);
  assert.equal(r.comms_events, 1);
  assert.equal(r.fallback_invoked, false);
  assert.equal(r.receipt_hash.length, 8);
});

test('operator commit / wait release', () => {
  for (const [resp, expect] of [['commit', 'COMMIT'], ['wait', 'WAIT']]) {
    const g = new G.Gate();
    g.step('ESCALATE', { t: 0, reason: 'uncertainty' });
    const r = g.step('ESCALATE', { t: 1, operatorResponse: resp });
    assert.equal(r.state, expect);
    assert.equal(r.released_by, 'operator');
    assert.equal(r.escalated_at, null);
  }
});

test('retry schedule: 5, 15, 35 s with backoff ×2; fallback at 75 s; comms counted', () => {
  const g = new G.Gate();
  g.step('ESCALATE', { t: 0, reason: 'uncertainty' });
  const seen = new Map();
  for (let i = 1; i < 200; i++) {
    const t = i * 0.5;
    const r = g.step('ESCALATE', { t });
    const key = `${r.state}|${r.retries}|${r.timeout_s}`;
    if (!seen.has(key)) seen.set(key, t);
  }
  assert.equal(seen.get('ESCALATE_PENDING|1|10'), 5);
  assert.equal(seen.get('ESCALATE_PENDING|2|20'), 15);
  assert.equal(seen.get('ESCALATE_PENDING|3|40'), 35);
  assert.equal(seen.get('FALLBACK_HOLD|3|null'), 75);
  assert.equal(G.totalBoundedWait(G.DEFAULT_PARAMS), 75);
  assert.equal(g.receipts.at(-1).comms_events, 4);
});

test('no path turns an unanswered ESCALATE into COMMIT', () => {
  for (const reason of REASONS) {
    const g = new G.Gate({ safeAction: () => 'loiter' });
    g.step('ESCALATE', { t: 0, reason });
    for (let i = 1; i < 2000; i++) {
      const r = g.step('ESCALATE', { t: i * 0.5 });
      assert.notEqual(r.state, 'COMMIT');
      assert.equal(r.action_allowed, false);
    }
  }
});

test('known-unreachable falls back immediately; link lost mid-retry falls back', () => {
  let g = new G.Gate();
  let r = g.step('ESCALATE', { t: 0, reason: 'uncertainty', operatorReachable: false });
  assert.equal(r.state, 'FALLBACK_HOLD');
  assert.equal(r.retries, 0);
  g = new G.Gate();
  g.step('ESCALATE', { t: 0, reason: 'uncertainty', operatorReachable: true });
  g.step('ESCALATE', { t: 5 });
  r = g.step('ESCALATE', { t: 6, operatorReachable: false });
  assert.equal(r.state, 'FALLBACK_HOLD');
  assert.equal(r.retries, 1);
});

test('safe_action present is invoked once and logged; absent logs "none" and holds', () => {
  let calls = 0;
  let g = new G.Gate({ safeAction: () => { calls++; return 'station_keep'; } });
  g.step('ESCALATE', { t: 0, reason: 'emergency_irreversible', operatorReachable: false });
  let r;
  for (let i = 1; i < 50; i++) r = g.step('ESCALATE', { t: i });
  assert.equal(r.safe_action_id, 'station_keep');
  assert.equal(calls, 1);
  g = new G.Gate();
  r = g.step('ESCALATE', { t: 0, reason: 'emergency_irreversible', operatorReachable: false });
  assert.equal(r.safe_action_id, 'none');
  assert.equal(r.action_allowed, false);
});

test('evidence releases FALLBACK_HOLD only for uncertainty, after k ticks above bar + delta', () => {
  const k = G.DEFAULT_PARAMS.k;
  for (const reason of REASONS) {
    const g = new G.Gate();
    g.step('ESCALATE', { t: 0, reason, operatorReachable: false });
    let r;
    for (let i = 1; i < k + 5; i++) r = g.step('COMMIT', { t: i, signal: 0.7, bar: 0.5 });
    if (reason === 'uncertainty') {
      assert.equal(r.state, 'COMMIT');
      const rel = g.receipts.filter(x => x.released_by === 'evidence');
      assert.equal(rel.length, 1);
      assert.equal(rel[0].dwell_ticks_at_release, k);
      assert.equal(rel[0].t, k);
    } else {
      assert.equal(r.state, 'FALLBACK_HOLD');
      assert.equal(r.released_by, 'none');
    }
  }
});

test('evidence release needs the margin, consecutive dwell, and a kernel that no longer escalates', () => {
  let g = new G.Gate({ params: { k: 3 } });
  g.step('ESCALATE', { t: 0, reason: 'uncertainty', operatorReachable: false });
  let r;
  for (let i = 1; i < 20; i++) r = g.step('COMMIT', { t: i, signal: 0.55, bar: 0.5 });  // under bar + delta
  assert.equal(r.state, 'FALLBACK_HOLD');
  g = new G.Gate({ params: { k: 5 } });
  g.step('ESCALATE', { t: 0, reason: 'uncertainty', operatorReachable: false });
  const seq = [0.7, 0.7, 0.7, 0.7, 0.5, 0.7, 0.7, 0.7, 0.7, 0.7];
  const states = seq.map((s, i) => g.step('COMMIT', { t: i + 1, signal: s, bar: 0.5 }).state);
  assert.deepEqual(states.slice(0, 9), Array(9).fill('FALLBACK_HOLD'));
  assert.equal(states[9], 'COMMIT');
  g = new G.Gate({ params: { k: 3 } });
  g.step('ESCALATE', { t: 0, reason: 'uncertainty', operatorReachable: false });
  for (let i = 1; i < 20; i++) r = g.step('ESCALATE', { t: i, signal: 0.9, bar: 0.5 });
  assert.equal(r.state, 'FALLBACK_HOLD');
});

test('link return resumes retries from zero on the same escalation', () => {
  const g = new G.Gate();
  g.step('ESCALATE', { t: 0, reason: 'uncertainty', operatorReachable: true });
  g.step('ESCALATE', { t: 5 });
  g.step('ESCALATE', { t: 15 });
  g.step('ESCALATE', { t: 16, operatorReachable: false });
  assert.equal(g.state, 'FALLBACK_HOLD');
  let r = g.step('ESCALATE', { t: 30, operatorReachable: true });
  assert.equal(r.state, 'ESCALATE_PENDING');
  assert.equal(r.retries, 0);
  assert.equal(r.timeout_s, 5);
  assert.equal(r.escalated_at, 0);
  assert.equal(r.comms_events, 4);
  r = g.step('ESCALATE', { t: 35 });
  assert.equal(r.retries, 1);
});

test('TOXIC latches from any state and releases only to an operator', () => {
  const g = new G.Gate({ safeAction: () => 'loiter' });
  g.step('TOXIC', { t: 0 });
  for (let i = 1; i < 3000; i++) {
    const r = g.step('COMMIT', { t: i, signal: 0.99, bar: 0.1, operatorReachable: i % 7 === 0 });
    assert.equal(r.state, 'TOXIC_LATCHED');
    assert.equal(r.fallback_invoked, false);
  }
  assert.equal(g.step('TOXIC', { t: 3000, operatorResponse: 'release' }).state, 'TOXIC_LATCHED');
  assert.equal(g.step('TOXIC', { t: 3001, operatorResponse: 'commit' }).state, 'TOXIC_LATCHED');
  const r = g.step('WAIT', { t: 3002, operatorResponse: 'release' });
  assert.equal(r.state, 'WAIT');
  assert.equal(r.released_by, 'operator');
  for (const start of ['COMMIT', 'HOLD', 'WAIT']) {
    const h = new G.Gate(); h.step(start, { t: 0 });
    assert.equal(h.step('TOXIC', { t: 1 }).state, 'TOXIC_LATCHED');
  }
  const p = new G.Gate(); p.step('ESCALATE', { t: 0, reason: 'uncertainty', operatorReachable: false });
  assert.equal(p.step('TOXIC', { t: 1 }).state, 'TOXIC_LATCHED');
});

test('receipts are deterministic', () => {
  const play = () => {
    const g = new G.Gate({ safeAction: () => 'loiter' });
    const out = [];
    for (let i = 0; i < 300; i++) {
      out.push(g.step(i < 200 ? 'ESCALATE' : 'COMMIT', {
        t: i * 0.5, reason: i === 0 ? 'uncertainty' : undefined,
        operatorReachable: i < 10 ? undefined : Math.floor(i / 40) % 2 === 0,
        signal: 0.7, bar: 0.5,
      }).receipt_hash);
    }
    return out;
  };
  assert.deepEqual(play(), play());
});

// ── v11 kernel adapter ──────────────────────────────────────────────────────

test('escalation reasons map from v11 flags', () => {
  const ones = { E: 1, S: 1, R: 1, Sp: 1, St: 1 };
  const brake = K.v11_evaluate({ E: 0.5, S: 0.6, R: 0.2, Sp: 0.35, St: 0.35 }, { ...ones, Sp: 0.25, St: 0.25 });
  assert.equal(brake.decision, 'ESCALATE');
  assert.equal(G.escalationReasonFromFlags(brake.flags), 'low_confidence_foundation');
  const emerg = K.v11_evaluate({ E: 0.9, S: 0.6, R: 0.3, Sp: 0.3, St: 0.3 }, ones);
  assert.equal(emerg.decision, 'ESCALATE');
  assert.equal(G.escalationReasonFromFlags(emerg.flags), 'emergency_irreversible');
  const commit = K.V11_SCENARIOS.find(s => s.id === 'commit');
  assert.equal(G.escalationReasonFromFlags(K.v11_evaluate(commit.v, commit.c).flags), null);
  assert.equal(G.escalationReasonFromFlags({ emergency_override: false, low_confidence_brake: true, one_way_brake: true }), 'low_confidence_foundation');
});

test('stepFromV11 feeds decision, |r| and τ into the gate', () => {
  const g = new G.Gate({ safeAction: () => 'retreat' });
  const emerg = K.v11_evaluate({ E: 0.9, S: 0.6, R: 0.3, Sp: 0.3, St: 0.3 }, { E: 1, S: 1, R: 1, Sp: 1, St: 1 });
  let r = G.stepFromV11(g, emerg, { t: 0, operatorReachable: false });
  assert.equal(r.state, 'FALLBACK_HOLD');
  assert.equal(r.escalation_reason, 'emergency_irreversible');
  assert.equal(r.safe_action_id, 'retreat');
  // evidence can never release an emergency escalation
  const clean = K.v11_evaluate(K.V11_SCENARIOS.find(s => s.id === 'commit').v, { E: 1, S: 1, R: 1, Sp: 1, St: 1 });
  for (let i = 1; i < 200; i++) r = G.stepFromV11(g, clean, { t: i * DT });
  assert.equal(r.state, 'FALLBACK_HOLD');
  assert.equal(r.released_by, 'none');
});

// ── replay-shaped scenarios (synthetic stand-ins for the drone harness) ─────

function silentStadium(recoverAt) {
  const g = new G.Gate({ safeAction: () => 'loiter' });
  const recs = [];
  for (let i = 0; i < 800; i++) {
    const t = i * DT;
    const recovered = recoverAt != null && t >= recoverAt - 1e-9;
    recs.push(g.step(recovered ? 'COMMIT' : 'ESCALATE', {
      t, reason: i === 0 ? 'uncertainty' : undefined,
      signal: recovered ? 0.7 : 0.4, bar: 0.5, operatorReachable: false,
    }));
  }
  return { g, recs };
}

test('silent stadium with recovery: FALLBACK_HOLD then COMMIT released by evidence, dwell recorded', () => {
  const { g, recs } = silentStadium(30);
  assert.equal(recs[0].state, 'FALLBACK_HOLD');
  const rel = recs.filter(r => r.released_by === 'evidence');
  assert.equal(rel.length, 1);
  assert.ok(Math.abs(rel[0].t - (30 + (g.p.k - 1) * DT)) < 1e-6);
  assert.equal(rel[0].dwell_ticks_at_release, g.p.k);
  const idx = recs.indexOf(rel[0]);
  assert.ok(recs.slice(0, idx).every(r => r.state === 'FALLBACK_HOLD'));
  assert.ok(recs.slice(idx).every(r => r.state === 'COMMIT'));
  assert.equal(recs.at(-1).comms_events, 1);
});

test('silent stadium, no recovery: FALLBACK_HOLD to end of run, no COMMIT', () => {
  const { recs } = silentStadium(null);
  assert.ok(recs.every(r => r.state === 'FALLBACK_HOLD' && !r.action_allowed));
  assert.equal(recs.at(-1).safe_action_id, 'loiter');
});

test('emergency irreversible, unreachable: safe_action invoked, never auto-released', () => {
  const g = new G.Gate({ safeAction: () => 'retreat_last_safe' });
  const recs = [];
  for (let i = 0; i < 800; i++) {
    const t = i * DT;
    recs.push(g.step(t >= 20 ? 'COMMIT' : 'ESCALATE', {
      t, reason: i === 0 ? 'emergency_irreversible' : undefined, signal: 0.9, bar: 0.5, operatorReachable: false,
    }));
  }
  assert.ok(recs.every(r => r.state === 'FALLBACK_HOLD' && r.released_by === 'none'));
  assert.equal(recs[0].safe_action_id, 'retreat_last_safe');
});

test('link flap: bounded retries, no thrash, comms events counted', () => {
  const g = new G.Gate({ safeAction: () => 'loiter' });
  const recs = [];
  const up = (t) => Math.floor(t / 3) % 2 === 0;
  for (let i = 0; i < 1200; i++) {
    const t = i * DT;
    recs.push(g.step('ESCALATE', { t, reason: i === 0 ? 'uncertainty' : undefined, signal: 0.4, bar: 0.5, operatorReachable: up(t) }));
  }
  assert.deepEqual([...new Set(recs.map(r => r.state))].sort(), ['ESCALATE_PENDING', 'FALLBACK_HOLD']);
  assert.ok(recs.every(r => !r.action_allowed));
  let flapsUp = 0;
  for (let i = 1; i < 1200; i++) if (up(i * DT) && !up((i - 1) * DT)) flapsUp++;
  assert.ok(recs.at(-1).comms_events <= 1 + flapsUp * (1 + g.p.N_retry));
  assert.ok(recs.at(-1).comms_events > flapsUp);
  let changes = 0;
  for (let i = 1; i < recs.length; i++) if (recs[i].state !== recs[i - 1].state) changes++;
  assert.ok(changes <= 2 * flapsUp + 2);
});

test('non-escalation paths: flip counts unchanged (pass-through)', () => {
  let s = 11;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const kernel = Array.from({ length: 2000 }, () => ['COMMIT', 'HOLD', 'WAIT'][Math.floor(rnd() * 3)]);
  const g = new G.Gate();
  const out = kernel.map((v, i) => g.step(v, { t: i * DT }).state);
  assert.deepEqual(out, kernel);
});
