// v11.1 risk-sign correction (spec §6): unit tests on the JSX kernel port.
// Run from the repo root:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadV11Core } from './load-v11-core.mjs';

const K = loadV11Core();
const ev = (v, c, o) => K.v11_evaluate(v, c, o || {});
const SQRT3 = Math.sqrt(3);
const ONES = { E: 1, S: 1, R: 1, Sp: 1, St: 1 };

test('kernel reports version 11.1', () => {
  assert.equal(K.v11_KERNEL_VERSION, '11.1');
  assert.equal(ev(ONES, ONES).kernel_version, '11.1');
});

test('r_y is zero: Risk does not contribute to the signal magnitude', () => {
  for (const R of [0, 0.3, 0.7, 1]) {
    const r = ev({ E: 0.5, S: 0.5, R, Sp: 0.5, St: 0.5 }, ONES);
    assert.equal(r.bloch_pure.r_y, 0);
    assert.equal(r.bloch.r_y, 0);
  }
  // magnitude is independent of R
  const a = ev({ E: 0.4, S: 0.6, R: 0.1, Sp: 0.7, St: 0.8 }, ONES).bloch.magnitude;
  const b = ev({ E: 0.4, S: 0.6, R: 0.9, Sp: 0.7, St: 0.8 }, ONES).bloch.magnitude;
  assert.ok(Math.abs(a - b) < 1e-12);
});

test('|r| ceiling is √(2/3) at the all-ones input (documented new ceiling)', () => {
  const p = K.v11_blochPure(ONES);
  assert.ok(Math.abs(p.r_x - 1 / SQRT3) < 1e-12);
  assert.ok(Math.abs(p.r_z - 1 / SQRT3) < 1e-12);
  assert.ok(Math.abs(p.magnitude - Math.sqrt(2 / 3)) < 1e-12);
  assert.ok(p.magnitude < 1);
  // and nothing exceeds it
  let rnd = 11;
  const next = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; };
  for (let i = 0; i < 5000; i++) {
    const v = { E: next(), S: next(), R: next(), Sp: next(), St: next() };
    assert.ok(K.v11_blochPure(v).magnitude <= Math.sqrt(2 / 3) + 1e-12);
  }
});

test('R_eff = 1 − c_R·(1 − R): full confidence gives R, zero confidence gives 1', () => {
  assert.ok(Math.abs(K.v11_effectiveRisk(0.3, 1) - 0.3) < 1e-12);
  assert.ok(Math.abs(K.v11_effectiveRisk(0.3, 0) - 1) < 1e-12);
  assert.ok(Math.abs(K.v11_effectiveRisk(0.3, 0.5) - 0.65) < 1e-12);
  // never below R, never above 1
  for (const R of [0, 0.25, 0.5, 0.9]) for (const c of [0, 0.3, 0.7, 1]) {
    const e = K.v11_effectiveRisk(R, c);
    assert.ok(e >= R - 1e-12 && e <= 1 + 1e-12);
  }
});

test('lower Risk confidence never makes the verdict less conservative (τ up, EV down)', () => {
  const v = { E: 0.5, S: 0.7, R: 0.4, Sp: 0.7, St: 0.7 };
  let prevTau = -Infinity, prevEv = Infinity;
  for (const cR of [1, 0.8, 0.6, 0.4, 0.2, 0]) {
    const r = ev(v, { E: 0.9, S: 0.9, R: cR, Sp: 0.9, St: 0.9 });
    assert.ok(r.tau >= prevTau - 1e-12, `tau not monotone at c_R=${cR}`);
    assert.ok(r.ev <= prevEv + 1e-12, `ev not monotone at c_R=${cR}`);
    prevTau = r.tau; prevEv = r.ev;
  }
});

test('TOXIC veto uses the raw R: uncertain risk escalates, it does not latch', () => {
  // integrity 0.1225 < 0.30 and reversibility 0.35 < 0.40: the veto turns on R alone
  const t = { E: 0.5, S: 0.5, R: 0.5, Sp: 0.35, St: 0.35 };
  for (const cR of [1, 0.5, 0.2, 0]) {
    const r = ev(t, { ...ONES, R: cR });
    assert.notEqual(r.decision, 'TOXIC', `c_R=${cR}: R=0.5 ≤ 0.65 must not veto`);   // R_eff reaches 1, still no veto
    assert.equal(r.decision, 'ESCALATE');   // irreversible + weak integrity: One-Way Brake, fallback path available
  }
  assert.equal(ev({ ...t, R: 0.7 }, ONES).decision, 'TOXIC');        // actual high risk vetoes
  assert.equal(ev({ ...t, R: 0.7 }, { ...ONES, R: 0.1 }).decision, 'TOXIC');
  // the "irreversible" preset stays ESCALATE, as in v11
  const s = K.V11_SCENARIOS.find(x => x.id === 'irreversible');
  assert.equal(ev(s.v, s.c).decision, 'ESCALATE');
});

test('C excludes Risk confidence and uses renormalized weights that sum to 1', () => {
  const w = K.v11_CONF_WEIGHTS;
  assert.ok(!('R' in w));
  assert.ok(Math.abs(w.E + w.S + w.Sp + w.St - 1) < 1e-12);
  const c1 = { E: 0.8, S: 0.7, R: 1.0, Sp: 0.9, St: 0.6 };
  const c2 = { E: 0.8, S: 0.7, R: 0.0, Sp: 0.9, St: 0.6 };
  assert.equal(K.v11_aggConfidence(c1), K.v11_aggConfidence(c2));
  assert.equal(ev({ E: 0.5, S: 0.5, R: 0.2, Sp: 0.5, St: 0.5 }, c1).aggregate_C,
               ev({ E: 0.5, S: 0.5, R: 0.2, Sp: 0.5, St: 0.5 }, c2).aggregate_C);
  assert.ok(Math.abs(K.v11_aggConfidence(ONES) - 1) < 1e-12);
});

test('Risk enters τ and the EV block through R_eff', () => {
  const lo = ev({ E: 0.5, S: 0.7, R: 0.1, Sp: 0.8, St: 0.8 }, ONES);
  const hi = ev({ E: 0.5, S: 0.7, R: 0.9, Sp: 0.8, St: 0.8 }, ONES);
  assert.ok(hi.tau > lo.tau);
  assert.ok(hi.ev < lo.ev);
  assert.equal(lo.flags.ev_block, false);
  assert.equal(hi.flags.ev_block, true);
  assert.ok(Math.abs(hi.risk_effective - 0.9) < 1e-12);
  // and through confidence alone: same R, lower c_R, EV block switches on
  const unsure = ev({ E: 0.5, S: 0.7, R: 0.1, Sp: 0.8, St: 0.8 }, { ...ONES, R: 0.1 });
  assert.equal(unsure.flags.ev_block, true);
  assert.ok(unsure.tau > lo.tau);
});

test('shrinkage scales the case for acting only: |r| falls with C, τ rises', () => {
  const v = { E: 0.5, S: 0.8, R: 0.3, Sp: 0.8, St: 0.8 };
  const full = ev(v, ONES), half = ev(v, { E: 0.5, S: 0.5, R: 1, Sp: 0.5, St: 0.5 });
  assert.ok(half.bloch.magnitude < full.bloch.magnitude);
  assert.ok(half.tau >= full.tau);
});

test('scenario presets: every verdict is valid and none moved in the permissive direction', () => {
  // v11 verdicts for the six presets (from the main-branch kernel):
  const V11 = { gaming: 'HOLD', audited: 'HOLD', soft: 'HOLD', toxic: 'TOXIC', irreversible: 'ESCALATE', commit: 'COMMIT' };
  const RANK = { COMMIT: 0, HOLD: 1, WAIT: 2, ESCALATE: 3, TOXIC: 4 };
  for (const s of K.V11_SCENARIOS) {
    const r = ev(s.v, s.c);
    assert.ok(RANK[r.decision] !== undefined, s.id);
    assert.ok(RANK[r.decision] >= RANK[V11[s.id]], `${s.id}: ${V11[s.id]} → ${r.decision} is permissive`);
  }
  // the textbook COMMIT survives; the toxic shape still vetoes
  assert.equal(ev(K.V11_SCENARIOS.find(s => s.id === 'commit').v, K.V11_SCENARIOS.find(s => s.id === 'commit').c).decision, 'COMMIT');
  assert.equal(ev(K.V11_SCENARIOS.find(s => s.id === 'toxic').v, K.V11_SCENARIOS.find(s => s.id === 'toxic').c).decision, 'TOXIC');
});

test('guards: emergency override and one-way brake still fire; low-confidence brake flag is unreachable (pre-existing)', () => {
  const ones = ONES;
  const emerg = ev({ E: 0.9, S: 0.6, R: 0.3, Sp: 0.3, St: 0.3 }, ones);
  assert.equal(emerg.decision, 'ESCALATE');
  assert.equal(emerg.flags.emergency_override, true);
  const brake = ev({ E: 0.5, S: 0.6, R: 0.2, Sp: 0.35, St: 0.35 }, { ...ones, Sp: 0.25, St: 0.25 });
  assert.equal(brake.decision, 'ESCALATE');
  assert.equal(brake.flags.one_way_brake, true);
  // reversibility < 0.4 implies Sp·St < 0.16 < BRAKE_I, so weak integrity always
  // accompanies an irreversible input and low_confidence_brake (lowIC && !weakI)
  // can never be set. Documented here, not changed: kernel constants are out of scope.
  assert.equal(brake.flags.low_confidence_brake, false);
});
