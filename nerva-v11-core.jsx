// nerva-v11-core.jsx — v11 mixed-state kernel as pure JS, plus React context.
// Ported from kernel/v11.ts. Same math, same verdicts, no API call needed.

const { createContext: V11Ctx, useContext: useV11Ctx, useState: useV11State, useMemo: useV11Memo, useEffect: useV11Effect, useCallback: useV11Callback, useRef: useV11Ref } = React;

// -----------------------------------------------------------------
// CONSTANTS (from kernel/v11.ts)
// -----------------------------------------------------------------
const CONF_WEIGHTS = { E: 0.15, S: 0.15, R: 0.15, Sp: 0.275, St: 0.275 };
const TAU_BASE = 0.25, TAU_E = 0.35, TAU_R = 0.25, TAU_REV = 0.15;
const BRAKE_REV = 0.4, BRAKE_I = 0.55, BRAKE_IC = 0.6;
const TOXIC_I_MAX = 0.30, TOXIC_R_MIN = 0.65;
const EMERG_U = 0.75, EMERG_REV_MAX = 0.4;
const HOLD_WAIT_I = 0.4, HOLD_WAIT_C = 0.5;
const SQRT3 = Math.sqrt(3);

const v11clamp = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

// -----------------------------------------------------------------
// MATH
// -----------------------------------------------------------------
function blochPure(v) {
  const r_x = (v.E + v.S) / (2 * SQRT3);
  const r_y = v.R / SQRT3;
  const r_z = (v.Sp * v.St) / SQRT3;
  return { r_x, r_y, r_z, magnitude: Math.sqrt(r_x*r_x + r_y*r_y + r_z*r_z) };
}
function blochMixed(pure, C) {
  return { r_x: C*pure.r_x, r_y: C*pure.r_y, r_z: C*pure.r_z, magnitude: C*pure.magnitude };
}
function aggConfidence(c) {
  return CONF_WEIGHTS.E*c.E + CONF_WEIGHTS.S*c.S + CONF_WEIGHTS.R*c.R + CONF_WEIGHTS.Sp*c.Sp + CONF_WEIGHTS.St*c.St;
}
function densityMetrics(state) {
  const r = state.magnitude;
  const lp = 0.5 * (1 + r), lm = 0.5 * (1 - r);
  const term = (l) => l <= 0 ? 0 : -l * Math.log2(l);
  return {
    entropy: term(lp) + term(lm),
    purity: 0.5 * (1 + r*r),
    coherence: Math.sqrt(state.r_x*state.r_x + state.r_y*state.r_y),
  };
}
function computeTau(entropy, risk, rev) {
  return TAU_BASE + TAU_E*entropy + TAU_R*risk - TAU_REV*rev;
}
function verdictPipeline(args) {
  const flags = { toxic_veto: false, emergency_override: false, one_way_brake: false, low_confidence_brake: false, ev_block: false };
  if (args.integrity < TOXIC_I_MAX && args.risk > TOXIC_R_MIN) {
    flags.toxic_veto = true; return { verdict: 'TOXIC', flags };
  }
  if (args.urgency >= EMERG_U && args.reversibility < EMERG_REV_MAX) {
    flags.emergency_override = true; return { verdict: 'ESCALATE', flags };
  }
  const irreversible = args.reversibility < BRAKE_REV;
  const weakI = args.integrity < BRAKE_I;
  const avgIC = (args.c_Sp + args.c_St) / 2;
  const lowIC = args.is_v11 && avgIC < BRAKE_IC;
  if (irreversible && (weakI || lowIC)) {
    flags.one_way_brake = true;
    if (lowIC && !weakI) flags.low_confidence_brake = true;
    return { verdict: 'ESCALATE', flags };
  }
  if (args.ev < 0) flags.ev_block = true;
  return { verdict: null, flags };
}
function verdictFromR(args) {
  if (args.override) return args.override;
  if (args.r >= args.tau) return args.ev_blocked ? 'HOLD' : 'COMMIT';
  const iOk = args.integrity >= HOLD_WAIT_I;
  const cOk = !args.confProvided || args.C >= HOLD_WAIT_C;
  return (iOk && cOk) ? 'HOLD' : 'WAIT';
}
function reason(verdict, ctx) {
  const r = (x, d=3) => Number(x.toFixed(d));
  if (ctx.flags.toxic_veto)        return `Hard veto. Integrity=${r(ctx.integrity)}, Risk above safety threshold. Autonomous action prohibited.`;
  if (ctx.flags.emergency_override) return `Emergency Override. High urgency on irreversible decision. Human authorization required.`;
  if (ctx.flags.low_confidence_brake) return `Low-confidence brake. Integrity-axis inputs are guesses on an irreversible decision. Verify inputs.`;
  if (ctx.flags.one_way_brake)     return `One-Way Brake. Irreversible decision with incomplete integrity foundation (I=${r(ctx.integrity)}).`;
  if (verdict === 'COMMIT')        return `Signal exceeds threshold. |r|=${r(ctx.r)} ≥ τ=${r(ctx.tau)}. Foundation sound.`;
  if (verdict === 'HOLD' && ctx.flags.ev_block) return `Signal above threshold but EV=${r(ctx.ev)} is negative. COMMIT suppressed; tighten inputs.`;
  if (verdict === 'HOLD')          return `Medium foundation. |r|=${r(ctx.r)} < τ=${r(ctx.tau)}. Tighten inputs and re-score.`;
  if (verdict === 'WAIT')          return `Insufficient signal. |r|=${r(ctx.r)} < τ=${r(ctx.tau)}. Gather more data.`;
  if (verdict === 'ESCALATE')      return `Decision crosses safety boundary. Human authorization required.`;
  if (verdict === 'TOXIC')         return `Hard veto.`;
  return '';
}

// -----------------------------------------------------------------
// FULL EVALUATION
// -----------------------------------------------------------------
function evaluate(values, confidences, opts = {}) {
  const v = { E: v11clamp(values.E), S: v11clamp(values.S), R: v11clamp(values.R), Sp: v11clamp(values.Sp), St: v11clamp(values.St) };
  const cRaw = confidences || {};
  const isV11 = opts.kernel !== 'v10';
  const c = isV11
    ? { E: v11clamp(cRaw.E ?? 1), S: v11clamp(cRaw.S ?? 1), R: v11clamp(cRaw.R ?? 1), Sp: v11clamp(cRaw.Sp ?? 1), St: v11clamp(cRaw.St ?? 1) }
    : { E: 1, S: 1, R: 1, Sp: 1, St: 1 };
  const provided = isV11 && (cRaw.E !== undefined || cRaw.S !== undefined || cRaw.R !== undefined || cRaw.Sp !== undefined || cRaw.St !== undefined);

  const pure = blochPure(v);
  const C = aggConfidence(c);
  const mixed = blochMixed(pure, C);
  const dens = densityMetrics(mixed);
  const densPure = densityMetrics(pure);

  const integrity = v.Sp * v.St;
  const reversibility = (v.Sp + v.St) / 2;
  const ev = v.Sp - v.R;
  const tau = opts.tauMode === 'manual'
    ? (opts.tauManual ?? 0.25)
    : computeTau(dens.entropy, v.R, reversibility);
  const tauPure = computeTau(densPure.entropy, v.R, reversibility);

  const pre = verdictPipeline({
    integrity, risk: v.R, reversibility, urgency: v.E, ev,
    c_Sp: c.Sp, c_St: c.St, is_v11: isV11,
  });
  const decision = verdictFromR({
    override: pre.verdict, ev_blocked: pre.flags.ev_block,
    r: mixed.magnitude, tau, integrity, C, confProvided: provided,
  });

  // Counterfactual: what would v10 say with c=1 across the board?
  let pureVerdict = decision;
  if (provided) {
    const prePure = verdictPipeline({
      integrity, risk: v.R, reversibility, urgency: v.E, ev,
      c_Sp: 1, c_St: 1, is_v11: false,
    });
    pureVerdict = verdictFromR({
      override: prePure.verdict, ev_blocked: prePure.flags.ev_block,
      r: pure.magnitude, tau: tauPure, integrity, C: 1, confProvided: false,
    });
  }

  return {
    decision, pure_verdict: pureVerdict,
    verdict_changed: pureVerdict !== decision,
    reason: reason(decision, { r: mixed.magnitude, tau, integrity, ev, flags: pre.flags }),
    flags: pre.flags,
    bloch: mixed, bloch_pure: pure,
    aggregate_C: C, shrinkage: C,
    entropy: dens.entropy, entropy_pure: densPure.entropy,
    purity: dens.purity, coherence: dens.coherence,
    integrity, reversibility, ev, tau, tau_pure: tauPure,
    confidences: c,
  };
}

// -----------------------------------------------------------------
// PRESET SCENARIOS — each one tells a v11-specific story
// -----------------------------------------------------------------
const V11_SCENARIOS = [
  {
    id: 'gaming',
    name: 'Gaming attempt',
    subtitle: 'high values, low-conf integrity inputs',
    desc: 'A caller sends optimistic point estimates on every input, but two inputs (Sp, St) were never measured — they were assigned defaults. v11’s low-confidence brake should refuse to validate.',
    v: { E: 0.30, S: 0.85, R: 0.30, Sp: 0.78, St: 0.78 },
    c: { E: 0.92, S: 0.90, R: 0.85, Sp: 0.25, St: 0.25 },
  },
  {
    id: 'audited',
    name: 'Audited inputs',
    subtitle: 'identical values, instrumented sources',
    desc: 'The same point estimates as the gaming case, but every input is sourced from instrumented telemetry. NERVA produces a confident verdict because the data supports it.',
    v: { E: 0.30, S: 0.85, R: 0.30, Sp: 0.78, St: 0.78 },
    c: { E: 0.96, S: 0.94, R: 0.92, Sp: 0.96, St: 0.94 },
  },
  {
    id: 'soft',
    name: 'Soft signal',
    subtitle: 'good estimates, medium confidence',
    desc: 'Plan-stage decision. Numbers are structured estimates but not yet measured. v11 maps this into HOLD with a counterfactual showing v10 would have allowed COMMIT.',
    v: { E: 0.45, S: 0.72, R: 0.42, Sp: 0.66, St: 0.62 },
    c: { E: 0.78, S: 0.72, R: 0.66, Sp: 0.58, St: 0.55 },
  },
  {
    id: 'toxic',
    name: 'Toxic shape',
    subtitle: 'low integrity × high risk',
    desc: 'High urgency, decent strategy, but integrity is collapsed and risk is acute. Hard veto regardless of confidence.',
    v: { E: 0.82, S: 0.74, R: 0.78, Sp: 0.18, St: 0.22 },
    c: { E: 0.86, S: 0.84, R: 0.92, Sp: 0.74, St: 0.72 },
  },
  {
    id: 'irreversible',
    name: 'Irreversible · weak',
    subtitle: 'One-Way Brake (v10 + v11 both)',
    desc: 'Decision is one-way and the integrity foundation is weak. The v10 brake fires; v11 confirms with high confidence.',
    v: { E: 0.55, S: 0.68, R: 0.62, Sp: 0.32, St: 0.35 },
    c: { E: 0.92, S: 0.88, R: 0.86, Sp: 0.90, St: 0.88 },
  },
  {
    id: 'commit',
    name: 'Clean commit',
    subtitle: 'instrumented, sound, reversible',
    desc: 'Reversible, well-supported, strong strategy, low risk, all inputs instrumented. The textbook COMMIT case.',
    v: { E: 0.35, S: 0.86, R: 0.22, Sp: 0.82, St: 0.78 },
    c: { E: 0.95, S: 0.95, R: 0.93, Sp: 0.97, St: 0.96 },
  },
];

// -----------------------------------------------------------------
// CONTEXT PROVIDER
// -----------------------------------------------------------------
const NervaV11Context = V11Ctx(null);

function NervaV11Provider({ children }) {
  const [v, setV] = useV11State({ E: 0.30, S: 0.85, R: 0.30, Sp: 0.78, St: 0.78 });
  const [c, setC] = useV11State({ E: 0.92, S: 0.90, R: 0.85, Sp: 0.25, St: 0.25 });
  const [unlocked, setUnlocked] = useV11State({ E: false, S: false, R: false, Sp: true, St: true });
  const [masterC, setMasterC] = useV11State(0.85);
  const [scenarioId, setScenarioId] = useV11State('gaming');
  const [tauMode, setTauMode] = useV11State('auto');
  const [tauManual, setTauManual] = useV11State(0.30);
  const [kernel, setKernel] = useV11State('v11');
  const [scenario, setScenario] = useV11State(V11_SCENARIOS[0].desc);

  const result = useV11Memo(() => evaluate(v, c, { kernel, tauMode, tauManual }), [v, c, kernel, tauMode, tauManual]);

  const updateValue = useV11Callback((k, val) => setV(s => ({ ...s, [k]: val })), []);
  const updateConfidence = useV11Callback((k, val) => {
    setC(s => ({ ...s, [k]: val }));
    setUnlocked(u => ({ ...u, [k]: true }));
  }, []);
  const updateMaster = useV11Callback((m) => {
    setMasterC(m);
    setC(s => {
      const next = { ...s };
      Object.keys(next).forEach(k => { if (!unlocked[k]) next[k] = m; });
      return next;
    });
  }, [unlocked]);
  const relock = useV11Callback(() => {
    setUnlocked({ E: false, S: false, R: false, Sp: false, St: false });
    setC({ E: masterC, S: masterC, R: masterC, Sp: masterC, St: masterC });
  }, [masterC]);
  const relockOne = useV11Callback((k) => {
    setC(s => ({ ...s, [k]: masterC }));
    setUnlocked(u => ({ ...u, [k]: false }));
  }, [masterC]);
  const applyScenario = useV11Callback((id) => {
    const s = V11_SCENARIOS.find(x => x.id === id);
    if (!s) return;
    setV(s.v); setC(s.c); setUnlocked({ E: true, S: true, R: true, Sp: true, St: true });
    setScenarioId(id); setScenario(s.desc);
  }, []);

  // History — last few decisions
  const [history, setHistory] = useV11State(() => {
    const seeds = [
      { v: { E: 0.42, S: 0.74, R: 0.30, Sp: 0.82, St: 0.78 }, c: { E: 0.95, S: 0.92, R: 0.88, Sp: 0.94, St: 0.92 }, label: 'DRN-04412', t: Date.now() - 1000*60*18 },
      { v: { E: 0.66, S: 0.78, R: 0.40, Sp: 0.70, St: 0.65 }, c: { E: 0.90, S: 0.85, R: 0.80, Sp: 0.60, St: 0.55 }, label: 'HFT-09921', t: Date.now() - 1000*60*14 },
      { v: { E: 0.55, S: 0.62, R: 0.58, Sp: 0.42, St: 0.38 }, c: { E: 0.88, S: 0.82, R: 0.85, Sp: 0.85, St: 0.82 }, label: 'DRN-04413', t: Date.now() - 1000*60*9 },
      { v: { E: 0.38, S: 0.84, R: 0.30, Sp: 0.85, St: 0.78 }, c: { E: 0.96, S: 0.94, R: 0.92, Sp: 0.96, St: 0.95 }, label: 'AVL-77108', t: Date.now() - 1000*60*5 },
      { v: { E: 0.50, S: 0.78, R: 0.42, Sp: 0.55, St: 0.52 }, c: { E: 0.82, S: 0.78, R: 0.72, Sp: 0.45, St: 0.42 }, label: 'ADV-30022', t: Date.now() - 1000*60*2 },
    ];
    return seeds.map(s => ({ ...s, result: evaluate(s.v, s.c, { kernel: 'v11', tauMode: 'auto' }) }));
  });

  // AI parser
  const [parsing, setParsing] = useV11State(false);
  const parseScenario = useV11Callback(async (text) => {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = await res.json();
      const vPatch = {}, cPatch = {};
      ['E','S','R','Sp','St'].forEach(k => {
        if (parsed[k] !== undefined) vPatch[k] = v11clamp(parseFloat(parsed[k]));
        const ck = 'c' + k;
        if (parsed[ck] !== undefined) cPatch[k] = v11clamp(parseFloat(parsed[ck]));
      });
      if (Object.keys(vPatch).length) setV(s => ({ ...s, ...vPatch }));
      if (Object.keys(cPatch).length) {
        setC(s => ({ ...s, ...cPatch }));
        setUnlocked(u => {
          const next = { ...u };
          Object.keys(cPatch).forEach(k => { next[k] = true; });
          return next;
        });
      }
      setScenarioId('');
    } catch (e) {
      console.warn('Parse error:', e);
    } finally {
      setParsing(false);
    }
  }, []);

  // API status
  const [api, setApi] = useV11State({ latency: 92, region: 'us-west-2', model: 'nerva-v11-haiku-4.5', status: 'nominal', uptime: 99.984 });
  useV11Effect(() => {
    const id = setInterval(() => {
      setApi(a => ({ ...a, latency: Math.max(60, Math.min(180, a.latency + (Math.random()-0.5)*14)) }));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const value = {
    v, c, unlocked, masterC, kernel, tauMode, tauManual, scenarioId, scenario,
    result, history, api, scenarios: V11_SCENARIOS,
    updateValue, updateConfidence, updateMaster, relock, applyScenario,
    parseScenario, parsing,
    setTauMode, setTauManual, setKernel, setScenario,
  };
  return React.createElement(NervaV11Context.Provider, { value }, children);
}

function useNervaV11() {
  const v = useV11Ctx(NervaV11Context);
  if (!v) throw new Error('useNervaV11 outside NervaV11Provider');
  return v;
}

function qualityLabel(c) {
  if (c >= 0.95) return 'INSTRUMENTED';
  if (c >= 0.80) return 'AUDITED';
  if (c >= 0.50) return 'STRUCTURED';
  if (c >= 0.30) return 'ROUGH';
  return 'GUESS';
}
function qualityColor(c) {
  if (c >= 0.80) return '#5fff87';
  if (c >= 0.55) return '#f5b942';
  if (c >= 0.35) return '#ff9a3c';
  return '#ff5c6c';
}

Object.assign(window, {
  NervaV11Provider, useNervaV11, V11_SCENARIOS,
  v11_evaluate: evaluate, v11_qualityLabel: qualityLabel, v11_qualityColor: qualityColor,
  v11_fmt: (n, d=2) => (n === null || n === undefined || Number.isNaN(n)) ? '—' : Number(n).toFixed(d),
});
