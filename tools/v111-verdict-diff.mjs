// v11.1 risk-sign correction: old-vs-new verdict diff (spec §6).
//
// Runs the v11 kernel (a git revision of nerva-v11-core.jsx, default main)
// and the working-tree kernel over three input sets and lists every verdict
// that changes. Pre-registered expectation (spec §6, as amended in review):
// no change is permissive. Permissive means any transition toward COMMIT,
// any drop in τ, or any rise in EV for the same inputs. A HOLD ↔ WAIT
// reclassification below threshold is listed but not counted: neither
// verdict permits action. Any permissive change fails the release.
//
//   node tools/v111-verdict-diff.mjs [--base main] [--out tools/v111-verdict-diff.md]
//
// Input sets
//   A. scenario set: the six cockpit presets and the five history seeds
//   B. replay frames: every tick of replay.html's deterministic replay
//      (tools/replay-frames.json, one seed; the drone-harness scenario set is
//      not in this repo and is reported as not run)
//   C. seeded sweep: 20,000 inputs, mulberry32(11), values uniform, each
//      confidence drawn from the data-quality tiers
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadV11Core, loadV11CoreFromSource, CORE_PATH, REPO_ROOT } from '../tests/load-v11-core.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', 'main');
const OUT = path.resolve(REPO_ROOT, opt('--out', 'tools/v111-verdict-diff.md'));

const oldSrc = execSync(`git show ${BASE}:nerva-v11-core.jsx`, { cwd: REPO_ROOT, encoding: 'utf8' });
const OLD = loadV11CoreFromSource(oldSrc);
const NEW = loadV11Core(CORE_PATH);
const oldSha = execSync(`git rev-parse --short ${BASE}`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

const RANK = { COMMIT: 0, HOLD: 1, WAIT: 2, ESCALATE: 3, TOXIC: 4 };
const TIERS = [0.25, 0.40, 0.55, 0.75, 0.90, 0.97, 1.0];

function mulberry32(a) { return function () { a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── input sets
const HISTORY = [
  { v: { E: 0.42, S: 0.74, R: 0.30, Sp: 0.82, St: 0.78 }, c: { E: 0.95, S: 0.92, R: 0.88, Sp: 0.94, St: 0.92 }, label: 'DRN-04412' },
  { v: { E: 0.66, S: 0.78, R: 0.40, Sp: 0.70, St: 0.65 }, c: { E: 0.90, S: 0.85, R: 0.80, Sp: 0.60, St: 0.55 }, label: 'HFT-09921' },
  { v: { E: 0.55, S: 0.62, R: 0.58, Sp: 0.42, St: 0.38 }, c: { E: 0.88, S: 0.82, R: 0.85, Sp: 0.85, St: 0.82 }, label: 'DRN-04413' },
  { v: { E: 0.38, S: 0.84, R: 0.30, Sp: 0.85, St: 0.78 }, c: { E: 0.96, S: 0.94, R: 0.92, Sp: 0.96, St: 0.95 }, label: 'AVL-77108' },
  { v: { E: 0.50, S: 0.78, R: 0.42, Sp: 0.55, St: 0.52 }, c: { E: 0.82, S: 0.78, R: 0.72, Sp: 0.45, St: 0.42 }, label: 'ADV-30022' },
];
const setA = [
  ...NEW.V11_SCENARIOS.map(s => ({ label: `preset:${s.id}`, v: s.v, c: s.c })),
  ...HISTORY.map(h => ({ label: `history:${h.label}`, v: h.v, c: h.c })),
];

let setB = [], replayMeta = null;
const framesPath = path.join(REPO_ROOT, 'tools', 'replay-frames.json');
if (fs.existsSync(framesPath)) {
  const d = JSON.parse(fs.readFileSync(framesPath, 'utf8'));
  replayMeta = { seed: d.seed, n: d.frames.length, hashes: d.receipt_hashes };
  setB = d.frames.map(f => ({ label: `replay:t=${f.s.toFixed(1)}`, v: f.v, c: f.c }));
}

const rnd = mulberry32(11);
const setC = [];
for (let i = 0; i < 20000; i++) {
  const v = { E: rnd(), S: rnd(), R: rnd(), Sp: rnd(), St: rnd() };
  const pick = () => TIERS[Math.floor(rnd() * TIERS.length)];
  const c = { E: pick(), S: pick(), R: pick(), Sp: pick(), St: pick() };
  setC.push({ label: `sweep:${i}`, v, c });
}

// ── diff
// Changes the spec names as conservative: COMMIT → HOLD/WAIT/ESCALATE.
const NAMED = new Set(['COMMIT → HOLD', 'COMMIT → WAIT', 'COMMIT → ESCALATE']);

const EPS = 1e-12;
const RECLASS = new Set(['WAIT → HOLD', 'HOLD → WAIT']);

function diffSet(name, items) {
  const trans = new Map();
  const permissive = [], conservative = [], other = [], reclass = [];
  let rUp = 0, tauDown = 0, evUp = 0;
  for (const it of items) {
    const o = OLD.v11_evaluate(it.v, it.c, { kernel: 'v11' });
    const n = NEW.v11_evaluate(it.v, it.c, { kernel: 'v11' });
    const rec = { label: it.label, v: it.v, c: it.c, from: o.decision, to: n.decision,
      r_old: o.bloch.magnitude, r_new: n.bloch.magnitude, tau_old: o.tau, tau_new: n.tau, ev_old: o.ev, ev_new: n.ev, R_eff: n.risk_effective, why: [] };
    if (n.bloch.magnitude > o.bloch.magnitude + EPS) rUp++;
    if (n.tau < o.tau - EPS) { tauDown++; rec.why.push('τ fell'); }
    if (n.ev > o.ev + EPS) { evUp++; rec.why.push('EV rose'); }
    const key = `${o.decision} → ${n.decision}`;
    if (o.decision !== n.decision) {
      trans.set(key, (trans.get(key) || 0) + 1);
      if (RECLASS.has(key)) reclass.push(rec);
      else if (RANK[n.decision] < RANK[o.decision]) rec.why.push('toward COMMIT');
      else if (NAMED.has(key)) conservative.push(rec);
      else other.push(rec);   // stricter, not named by the spec (→ ESCALATE, → TOXIC, …)
    }
    if (rec.why.length) permissive.push(rec);
  }
  return { name, n: items.length, trans, permissive, conservative, other, reclass, rUp, tauDown, evUp };
}

const results = [diffSet('A. scenario set (presets + history seeds)', setA)];
if (setB.length) results.push(diffSet('B. replay frames (replay.html, one seed)', setB));
results.push(diffSet('C. seeded sweep (20,000 inputs, mulberry32(11))', setC));

// ── sensitivity: the same correction with C's four weights left unnormalized
// (max C = 0.85). Then C_new ≤ C_old for every input, so |r| can never rise,
// but full-confidence inputs are shrunk by 0.85. Reported for the reviewer;
// the working-tree kernel uses the renormalized weights.
const RAW_LINE = 'const CONF_WEIGHTS = { E: 0.15 / 0.85, S: 0.15 / 0.85, Sp: 0.275 / 0.85, St: 0.275 / 0.85 };';
const newSrc = fs.readFileSync(CORE_PATH, 'utf8');
let altResults = null;
if (newSrc.includes(RAW_LINE)) {
  const ALT = loadV11CoreFromSource(newSrc.replace(RAW_LINE, 'const CONF_WEIGHTS = { E: 0.15, S: 0.15, Sp: 0.275, St: 0.275 };'));
  const savedEval = NEW.v11_evaluate;
  NEW.v11_evaluate = ALT.v11_evaluate;
  altResults = [diffSet('A', setA), setB.length ? diffSet('B', setB) : null, diffSet('C', setC)].filter(Boolean);
  NEW.v11_evaluate = savedEval;
}

// ── report
const f3 = x => x.toFixed(3);
const fmtIn = r => `E ${f3(r.v.E)}/${f3(r.c.E)} S ${f3(r.v.S)}/${f3(r.c.S)} R ${f3(r.v.R)}/${f3(r.c.R)} Sp ${f3(r.v.Sp)}/${f3(r.c.Sp)} St ${f3(r.v.St)}/${f3(r.c.St)}`;
const lines = [];
lines.push('# v11.1 risk-sign correction: verdict diff');
lines.push('');
lines.push(`Old kernel: \`nerva-v11-core.jsx\` at \`${BASE}\` (${oldSha}). New kernel: working tree (v${NEW.v11_KERNEL_VERSION}).`);
lines.push('Generated by `node tools/v111-verdict-diff.mjs`. Verdict order: COMMIT < HOLD < WAIT < ESCALATE < TOXIC.');
lines.push('Spec §6 as amended in review: **permissive** means any transition toward COMMIT, any drop in τ, or any rise in EV for the same inputs, whether or not the verdict changed. A **HOLD ↔ WAIT reclassification** below threshold is listed but not counted; neither verdict permits action. The spec names COMMIT → HOLD/WAIT/ESCALATE as the conservative direction; other stricter moves are listed for the reviewer.');
lines.push('');
const totalPermissive = results.reduce((s, r) => s + r.permissive.length, 0);
const totalOther = results.reduce((s, r) => s + r.other.length, 0);
const totalReclass = results.reduce((s, r) => s + r.reclass.length, 0);
lines.push(`## Result: ${totalPermissive === 0 ? 'PASS' : 'FAIL'} (${totalPermissive} permissive change${totalPermissive === 1 ? '' : 's'})`);
lines.push('');
lines.push(`HOLD ↔ WAIT reclassifications, listed and not counted: ${totalReclass}. Stricter changes the spec does not name (→ ESCALATE, → TOXIC): ${totalOther}.`);
lines.push('');
if (!replayMeta) lines.push('Replay frames not found (tools/replay-frames.json); set B not run.');
lines.push('Drone-harness scenario set: not in this repository, not run.');
lines.push('');
for (const r of results) {
  lines.push(`## ${r.name}`);
  lines.push('');
  const changed = [...r.trans.values()].reduce((a, b) => a + b, 0);
  lines.push(`Inputs: ${r.n}. Verdicts changed: ${changed}. Permissive: ${r.permissive.length}. Named conservative (COMMIT → non-COMMIT): ${r.conservative.length}. Other stricter: ${r.other.length}. HOLD ↔ WAIT reclassified (not counted): ${r.reclass.length}.`);
  lines.push(`Inputs where new |r| > old |r|: ${r.rUp}. Where new τ < old τ: ${r.tauDown}. Where new EV > old EV: ${r.evUp}.`);
  lines.push('');
  if (r.trans.size) {
    lines.push('| Transition | Count |');
    lines.push('|---|---|');
    for (const [k, v] of [...r.trans.entries()].sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
    lines.push('');
  }
  if (r.permissive.length) {
    lines.push('### Permissive changes (release-blocking)');
    lines.push('');
    for (const p of r.permissive.slice(0, 50)) {
      lines.push(`- **${p.label}**: ${p.from} → ${p.to} (${p.why.join(', ')}). ${fmtIn(p)}. |r| ${f3(p.r_old)}→${f3(p.r_new)}, τ ${f3(p.tau_old)}→${f3(p.tau_new)}, EV ${f3(p.ev_old)}→${f3(p.ev_new)}, R_eff ${f3(p.R_eff)}`);
    }
    if (r.permissive.length > 50) lines.push(`- … ${r.permissive.length - 50} more`);
    lines.push('');
  }
  {
    const cap = r.name.startsWith('A.') ? Infinity : 12;
    for (const [title, list] of [['Named conservative changes', r.conservative], ['Other stricter changes (reviewer to classify)', r.other], ['HOLD ↔ WAIT reclassifications (listed, not counted)', r.reclass]]) {
      const show = list.slice(0, cap);
      if (!show.length) continue;
      lines.push(`### ${title}` + (list.length > show.length ? ` (first ${show.length} of ${list.length})` : ''));
      lines.push('');
      for (const p of show) {
        lines.push(`- ${p.label}: ${p.from} → ${p.to}. ${fmtIn(p)}. |r| ${f3(p.r_old)}→${f3(p.r_new)}, τ ${f3(p.tau_old)}→${f3(p.tau_new)}, R_eff ${f3(p.R_eff)}`);
      }
      lines.push('');
    }
  }
}
if (replayMeta) {
  lines.push(`Replay frames: seed ${replayMeta.seed}, ${replayMeta.n} ticks, receipt hashes ${replayMeta.hashes.join(', ')}.`);
  lines.push('');
}
if (altResults) {
  lines.push('## Appendix: sensitivity to the C normalization');
  lines.push('');
  lines.push('The working-tree kernel renormalizes the four remaining confidence weights to sum to 1, so full confidence gives C = 1. Because c_R no longer enters C, C can be higher than in v11 when Risk confidence was low; τ rose more than |r| in every sampled case, but that is observed, not proved. The alternative below keeps the raw weights (max C = 0.85), which makes C_new ≤ C_old for every input and |r| provably non-increasing, at the cost of shrinking fully instrumented inputs by 0.85.');
  lines.push('');
  const tot = r => [...r.trans.values()].reduce((a, b) => a + b, 0);
  lines.push('| Set | Changed | Permissive | Named conservative | Other stricter | HOLD ↔ WAIT | new |r| > old |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of altResults) lines.push(`| ${r.name} (raw weights) | ${tot(r)} | ${r.permissive.length} | ${r.conservative.length} | ${r.other.length} | ${r.reclass.length} | ${r.rUp} |`);
  for (const r of results) lines.push(`| ${r.name[0]} (renormalized, as implemented) | ${tot(r)} | ${r.permissive.length} | ${r.conservative.length} | ${r.other.length} | ${r.reclass.length} | ${r.rUp} |`);
  lines.push('');
  const altCommit = (() => { const s = NEW.V11_SCENARIOS.find(x => x.id === 'commit'); const ALT = loadV11CoreFromSource(newSrc.replace(RAW_LINE, 'const CONF_WEIGHTS = { E: 0.15, S: 0.15, Sp: 0.275, St: 0.275 };')); return ALT.v11_evaluate(s.v, s.c).decision; })();
  lines.push(`Under raw weights the "Clean commit" preset evaluates to ${altCommit}; under the renormalized weights it stays COMMIT.`);
  lines.push('');
}
lines.push('Starpoint LLC');
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(lines.slice(0, 8).join('\n'));
for (const r of results) console.log(`${r.name}: n=${r.n} changed=${[...r.trans.values()].reduce((a, b) => a + b, 0)} permissive=${r.permissive.length} namedConservative=${r.conservative.length} otherStricter=${r.other.length} reclassified=${r.reclass.length} rUp=${r.rUp} tauDown=${r.tauDown} evUp=${r.evUp}`);
console.log(`wrote ${OUT}`);
process.exitCode = totalPermissive === 0 ? 0 : 1;
