// variation-v11-mobile.jsx — NERVA v11 cockpit, mobile layout.
// Reuses NervaV11Provider + useNervaV11 + V11InputRow + MasterDial + V11PhaseSpace
// from variation-v11.jsx. Stacks them vertically into a single scroll column.

const { useState: uMs, useMemo: uMm } = React;

// Tokens — match desktop
const tm = {
  bg: '#0a0e15',
  surface: '#11161f',
  surfaceLo: '#080b11',
  ink: '#e8e3d8',
  inkDim: 'rgba(232,227,216,0.62)',
  inkFaint: 'rgba(232,227,216,0.36)',
  inkGhost: 'rgba(232,227,216,0.18)',
  line: 'rgba(232,227,216,0.08)',
  lineHi: 'rgba(232,227,216,0.18)',
  accent: '#f5b942',
  signal: '#4cc9f0',
  intent: '#a78bfa',
  integrity: '#3ddc97',
  risk: '#ff5c6c',
  serif: '"Newsreader", Georgia, serif',
  sans: '"IBM Plex Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

const TM_VC = {
  COMMIT:   { fg: '#3ddc97', bg: 'rgba(61,220,151,0.08)' },
  HOLD:     { fg: '#f5b942', bg: 'rgba(245,185,66,0.08)' },
  WAIT:     { fg: '#7aa7ff', bg: 'rgba(122,167,255,0.08)' },
  ESCALATE: { fg: '#ff9a3c', bg: 'rgba(255,154,60,0.10)' },
  TOXIC:    { fg: '#ff5c6c', bg: 'rgba(255,92,108,0.12)' },
};

function MCard({ title, hint, accent, children, style }) {
  return (
    <section style={{
      background: tm.surface, border: `1px solid ${tm.line}`,
      ...(accent ? { borderTop: `2px solid ${accent}` } : {}),
      display:'flex', flexDirection:'column', ...style,
    }}>
      {title && (
        <header style={{
          display:'flex', alignItems:'baseline', justifyContent:'space-between',
          padding:'10px 14px 0', gap: 8,
        }}>
          <span style={{ font:`500 9.5px/1 ${tm.mono}`, color: tm.inkDim, letterSpacing:'0.2em' }}>{title}</span>
          {hint && <span style={{ font:`9.5px/1 ${tm.mono}`, color: tm.inkFaint, letterSpacing:'0.08em' }}>{hint}</span>}
        </header>
      )}
      <div style={{ padding: '8px 14px 14px' }}>{children}</div>
    </section>
  );
}

// Compact mobile input row — same logic as desktop, slightly more touch-friendly
function MInputRow({ symbol, label, sub, value, conf, unlocked, axisColor, onValue, onConf, onRelockOne, isLast }) {
  const qColor = v11_qualityColor(conf);
  return (
    <div style={{
      padding: '11px 0 10px',
      borderTop: `1px solid ${tm.line}`,
      borderBottom: isLast ? `1px solid ${tm.line}` : 'none',
    }}>
      <div style={{ display:'flex', alignItems:'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ font:`600 13px/1 ${tm.mono}`, color: axisColor, width: 22, flex:'0 0 auto' }}>{symbol}</span>
        <span style={{ font:`500 13.5px/1 ${tm.sans}`, color: tm.ink, flex:'0 0 auto' }}>{label}</span>
        <span style={{
          font:`italic 11px/1.2 ${tm.serif}`, color: tm.inkFaint,
          flex: 1, minWidth: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>· {sub}</span>
        <span style={{ font:`500 16px/1 ${tm.mono}`, color: tm.ink, fontVariantNumeric:'tabular-nums' }}>{v11_fmt(value, 2)}</span>
      </div>

      <input type="range" min="0" max="1" step="0.01" value={value}
        onChange={e => onValue(parseFloat(e.target.value))}
        style={{ width:'100%', color: axisColor, margin:'0 0 10px' }} />

      <div style={{ display:'flex', alignItems:'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ font:`500 9px/1 ${tm.mono}`, color: tm.inkFaint, letterSpacing:'0.18em' }}>QUALITY</span>
        <span style={{ font:`500 9px/1 ${tm.mono}`, color: qColor, letterSpacing:'0.18em' }}>· {v11_qualityLabel(conf)}</span>
        <span style={{ marginLeft:'auto', font:`500 12px/1 ${tm.mono}`, color: qColor }}>
          {Math.round(conf*100)}<span style={{ color: tm.inkFaint }}>%</span>
        </span>
        <button onClick={onRelockOne}
          style={{
            background:'transparent', border:'none', padding: 0, marginLeft: 6,
            color: unlocked ? tm.accent : 'transparent', cursor: unlocked ? 'pointer' : 'default',
            font:`14px/1 ${tm.mono}`, width: 16, flex:'0 0 auto',
          }}>↺</button>
      </div>

      <input type="range" min="0" max="1" step="0.01" value={conf}
        className="nerva-conf-slider"
        onChange={e => onConf(parseFloat(e.target.value))}
        style={{ width:'100%', color: qColor, opacity: 0.92, margin: 0 }} />
    </div>
  );
}

// Compact phase space for mobile (re-uses anisotropic envelope logic)
function MPhase({ result, c }) {
  const W = 360, H = 300;
  const M = { l: 36, r: 20, t: 22, b: 30 };
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const DOMAIN = 0.68;
  const xp = v => M.l + (v / DOMAIN) * pw;
  const yp = v => M.t + (1 - v / DOMAIN) * ph;
  const pure = result.bloch_pure, mixed = result.bloch;
  const vc = TM_VC[result.decision];
  const cIntent = (c.E + c.S) / 2;
  const cInteg = c.Sp * c.St;
  const rxB = Math.min(0.28, (1 - cIntent) * 0.38);
  const ryB = Math.min(0.28, (1 - cInteg) * 0.38);
  const rxS = (rxB / DOMAIN) * pw, ryS = (ryB / DOMAIN) * ph;
  const purePx = xp(pure.r_x), purePy = yp(pure.r_z);
  const mixedPx = xp(mixed.r_x), mixedPy = yp(mixed.r_z);
  const tau = result.tau;
  const tauR = (tau / DOMAIN) * Math.min(pw, ph);
  const oPx = xp(0), oPy = yp(0);
  const zones = [
    { y0: 0,       h: ph*0.32, fg: TM_VC.COMMIT.fg, label:'COMMIT' },
    { y0: ph*0.32, h: ph*0.28, fg: TM_VC.HOLD.fg, label:'HOLD' },
    { y0: ph*0.60, h: ph*0.18, fg: TM_VC.WAIT.fg, label:'WAIT' },
    { y0: ph*0.78, h: ph*0.22, fg: TM_VC.ESCALATE.fg, label:'BRAKE' },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width:'100%', height:'auto', display:'block' }}>
      <defs>
        <radialGradient id="env-grad-m" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={vc.fg} stopOpacity="0.35" />
          <stop offset="65%" stopColor={vc.fg} stopOpacity="0.12" />
          <stop offset="100%" stopColor={vc.fg} stopOpacity="0" />
        </radialGradient>
        <pattern id="psg-m" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={tm.line} strokeWidth="0.6" />
        </pattern>
      </defs>
      {zones.map((z, i) => (
        <g key={i}>
          <rect x={M.l} y={M.t + z.y0} width={pw} height={z.h} fill={z.fg} opacity="0.05" />
          <text x={M.l + pw - 6} y={M.t + z.y0 + 11} textAnchor="end"
            style={{ font:`600 9px ${tm.mono}`, fill: z.fg, opacity: 0.6, letterSpacing:'0.18em' }}>{z.label}</text>
        </g>
      ))}
      <rect x={M.l} y={M.t} width={pw} height={ph} fill="url(#psg-m)" />
      <line x1={M.l} y1={M.t} x2={M.l} y2={M.t+ph} stroke={tm.lineHi} strokeWidth="1" />
      <line x1={M.l} y1={M.t+ph} x2={M.l+pw} y2={M.t+ph} stroke={tm.lineHi} strokeWidth="1" />
      <circle cx={oPx} cy={oPy} r={tauR} fill="none" stroke={tm.risk} strokeWidth="1.1" strokeDasharray="3 3" opacity="0.7" />
      <text x={oPx + tauR*0.707 + 4} y={oPy - tauR*0.707 - 4} style={{ font:`9px ${tm.mono}`, fill: tm.risk, opacity: 0.9 }}>τ = {v11_fmt(tau, 3)}</text>
      <text x={M.l + pw/2} y={H - 4} textAnchor="middle" style={{ font:`italic 10px ${tm.serif}`, fill: tm.inkDim }}>intent  r_x</text>
      <text x={10} y={M.t + ph/2} textAnchor="middle" transform={`rotate(-90 10 ${M.t + ph/2})`} style={{ font:`italic 10px ${tm.serif}`, fill: tm.inkDim }}>integrity  r_z</text>
      <ellipse cx={mixedPx} cy={mixedPy} rx={rxS} ry={ryS} fill="url(#env-grad-m)" stroke={vc.fg} strokeWidth="0.8" strokeOpacity="0.55" strokeDasharray="2 3" />
      <line x1={mixedPx - rxS} y1={mixedPy} x2={mixedPx + rxS} y2={mixedPy} stroke={tm.intent} strokeWidth="1" opacity="0.55" />
      <line x1={mixedPx} y1={mixedPy - ryS} x2={mixedPx} y2={mixedPy + ryS} stroke={tm.integrity} strokeWidth="1" opacity="0.55" />
      <line x1={purePx} y1={purePy} x2={mixedPx} y2={mixedPy} stroke={tm.inkDim} strokeWidth="1" strokeDasharray="2 2" />
      <circle cx={purePx} cy={purePy} r="4.5" fill="none" stroke={tm.inkDim} strokeWidth="1.2" />
      <circle cx={mixedPx} cy={mixedPy} r="6" fill={vc.fg} stroke={tm.bg} strokeWidth="1.5" />
    </svg>
  );
}

// Master dial — same as desktop but slightly smaller
function MMasterDial({ value, onChange, hasUnlocked, onRelock }) {
  const size = 110;
  const cx = size/2, cy = size/2;
  const rOuter = 44, rInner = 36;
  const startA = 135, endA = 405;
  const valA = startA + (endA - startA) * value;
  const ticks = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const ang = (startA + (endA - startA) * t) * Math.PI / 180;
    const major = i % 6 === 0;
    const r1 = rOuter + 1, r2 = rOuter + (major ? 6 : 3);
    const active = t <= value;
    ticks.push(<line key={i}
      x1={cx + Math.cos(ang)*r1} y1={cy + Math.sin(ang)*r1}
      x2={cx + Math.cos(ang)*r2} y2={cy + Math.sin(ang)*r2}
      stroke={active ? v11_qualityColor(t) : tm.inkGhost} strokeWidth={major ? 1.4 : 0.6} />);
  }
  const a0 = startA * Math.PI / 180, a1 = valA * Math.PI / 180;
  const large = (valA - startA) > 180 ? 1 : 0;
  const arcD = `M ${cx + Math.cos(a0)*rInner} ${cy + Math.sin(a0)*rInner} A ${rInner} ${rInner} 0 ${large} 1 ${cx + Math.cos(a1)*rInner} ${cy + Math.sin(a1)*rInner}`;
  const valAR = valA * Math.PI / 180;
  const arcColor = v11_qualityColor(value);
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
      <div style={{ position:'relative', width: size, height: size, flex:'0 0 auto' }}>
        <svg width={size} height={size} style={{ position:'absolute', inset: 0 }}>
          {ticks}
          <path d={arcD} fill="none" stroke={arcColor} strokeWidth="2.5" strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={cx + Math.cos(valAR)*(rInner-3)} y2={cy + Math.sin(valAR)*(rInner-3)} stroke={arcColor} strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="3.5" fill={tm.bg} stroke={arcColor} strokeWidth="1.5" />
        </svg>
        <div style={{ position:'absolute', inset: 0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ font:`300 22px/1 ${tm.mono}`, color: tm.ink, fontVariantNumeric:'tabular-nums' }}>{Math.round(value*100)}</div>
          <div style={{ font:`9px/1 ${tm.mono}`, color: tm.inkFaint, marginTop: 2 }}>%</div>
        </div>
      </div>
      <div style={{ flex: 1, display:'flex', flexDirection:'column', gap: 5, minWidth: 0 }}>
        <div style={{ font:`500 10px/1 ${tm.mono}`, color: arcColor, letterSpacing:'0.22em' }}>
          {v11_qualityLabel(value)}
        </div>
        <input type="range" min="0" max="1" step="0.01" value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ width:'100%', color: arcColor }} />
        <button onClick={onRelock} disabled={!hasUnlocked} style={{
          background:'transparent',
          color: hasUnlocked ? tm.accent : tm.inkGhost,
          border: `1px solid ${hasUnlocked ? `${tm.accent}55` : tm.line}`,
          font:`600 10px/1 ${tm.mono}`, letterSpacing:'0.14em',
          padding:'6px 0', cursor: hasUnlocked ? 'pointer' : 'not-allowed',
        }}>↺ RELOCK ALL TO MASTER</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// MAIN MOBILE COCKPIT
// ---------------------------------------------------------------
function NervaV11Mobile() {
  const {
    v, c, unlocked, masterC, kernel, tauMode, tauManual, scenarioId, scenario,
    result, history, api, scenarios,
    updateValue, updateConfidence, updateMaster, relock, relockOne, applyScenario,
    setTauMode, setTauManual, setKernel, setScenario,
  } = useNervaV11();
  const vc = TM_VC[result.decision];
  const vcPure = TM_VC[result.pure_verdict];
  const hasUnlocked = Object.values(unlocked).some(Boolean);

  const [tab, setTab] = uMs('provenance');
  const [scenarioOpen, setScenarioOpen] = uMs(false);

  const inputDefs = [
    { k: 'E',  label: 'Urgency',   sub: 'priority / time pressure',      axis: tm.intent },
    { k: 'S',  label: 'Strategy',  sub: 'plan quality / coherence',      axis: tm.intent },
    { k: 'R',  label: 'Risk',      sub: 'exposure to negative outcomes', axis: tm.risk },
    { k: 'Sp', label: 'Support',   sub: 'evidence / data confidence',    axis: tm.integrity },
    { k: 'St', label: 'Stability', sub: 'environment / system health',   axis: tm.integrity },
  ];
  const brakeActive = result.flags.toxic_veto || result.flags.emergency_override || result.flags.one_way_brake || result.flags.low_confidence_brake;

  return (
    <div style={{
      background: tm.bg, color: tm.ink, fontFamily: tm.sans, minHeight:'100vh', width:'100%',
      paddingBottom: 'env(safe-area-inset-bottom, 12px)',
    }}>
      {/* TOP BAR */}
      <header style={{
        position:'sticky', top: 0, zIndex: 10,
        background: tm.surfaceLo, borderBottom:`1px solid ${tm.line}`,
        padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between',
        font:`11px/1 ${tm.mono}`, letterSpacing:'0.1em',
      }}>
        <div style={{ display:'flex', alignItems:'baseline', gap: 8 }}>
          <span style={{ color: tm.accent, fontWeight: 600, letterSpacing:'0.32em' }}>NERVA</span>
          <span style={{ color: tm.inkDim }}>v11</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ display:'flex', gap: 0, border:`1px solid ${tm.line}` }}>
            {['v11','v10'].map(k => (
              <button key={k} onClick={() => setKernel(k)} style={{
                background: kernel === k ? tm.accent : 'transparent',
                color: kernel === k ? '#000' : tm.inkDim,
                border:'none',
                font:`600 9px/1 ${tm.mono}`, letterSpacing:'0.12em',
                padding:'4px 7px', cursor:'pointer',
              }}>{k.toUpperCase()}</button>
            ))}
          </div>
          <span style={{ color: TM_VC.COMMIT.fg, fontSize: 10 }}>● {api.region}</span>
        </div>
      </header>

      <main style={{ padding: '12px', display:'flex', flexDirection:'column', gap: 10 }}>

        {/* ============ VERDICT — hero ============ */}
        <MCard accent={vc.fg} style={{ background: tm.surface }}>
          <div style={{ font:`9.5px/1 ${tm.mono}`, color: tm.inkFaint, letterSpacing:'0.22em' }}>VERDICT · v11</div>
          <div style={{
            font:`200 56px/0.94 ${tm.serif}`, color: vc.fg, letterSpacing:'-0.03em', marginTop: 4,
          }}>
            {result.decision.charAt(0) + result.decision.slice(1).toLowerCase()}
          </div>

          {result.verdict_changed && (
            <div style={{
              display:'inline-flex', alignItems:'center', gap: 5, marginTop: 8,
              font:`600 9.5px/1 ${tm.mono}`, color: tm.accent, letterSpacing:'0.18em',
              background:'rgba(245,185,66,0.12)', border:`1px solid ${tm.accent}55`,
              padding:'4px 7px',
            }}>
              Δ FROM v10 · was {result.pure_verdict}
            </div>
          )}

          <p style={{ margin:'10px 0 0', font:`13.5px/1.55 ${tm.serif}`, color: tm.ink, textWrap:'pretty' }}>
            {result.reason}
          </p>

          {result.verdict_changed && (
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 22px 1fr', gap: 10,
              marginTop: 12, paddingTop: 10, borderTop:`1px solid ${tm.line}`,
              alignItems:'center',
            }}>
              <div>
                <div style={{ font:`9.5px/1 ${tm.mono}`, color: tm.inkFaint, letterSpacing:'0.14em', marginBottom: 2 }}>v10 · PURE</div>
                <div style={{ font:`500 16px/1 ${tm.serif}`, color: vcPure.fg }}>{result.pure_verdict.charAt(0) + result.pure_verdict.slice(1).toLowerCase()}</div>
                <div style={{ font:`10px/1.3 ${tm.mono}`, color: tm.inkDim, marginTop: 2 }}>
                  |r|={v11_fmt(result.bloch_pure.magnitude,3)}
                </div>
              </div>
              <div style={{ font:`14px/1 ${tm.mono}`, color: tm.accent, textAlign:'center' }}>→</div>
              <div>
                <div style={{ font:`9.5px/1 ${tm.mono}`, color: tm.inkFaint, letterSpacing:'0.14em', marginBottom: 2 }}>v11 · MIXED</div>
                <div style={{ font:`500 16px/1 ${tm.serif}`, color: vc.fg }}>{result.decision.charAt(0) + result.decision.slice(1).toLowerCase()}</div>
                <div style={{ font:`10px/1.3 ${tm.mono}`, color: tm.inkDim, marginTop: 2 }}>
                  |r|={v11_fmt(result.bloch.magnitude,3)} · C={v11_fmt(result.aggregate_C,2)}
                </div>
              </div>
            </div>
          )}

          {/* Compact 4-stat strip */}
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 0,
            marginTop: 12, borderTop:`1px solid ${tm.line}`,
          }}>
            {[
              ['|r|', v11_fmt(result.bloch.magnitude,3), vc.fg],
              ['τ',   v11_fmt(result.tau,3), tm.ink],
              ['C',   v11_fmt(result.aggregate_C,2), v11_qualityColor(result.aggregate_C)],
              ['EV',  v11_fmt(result.ev,2), result.ev > 0 ? TM_VC.COMMIT.fg : TM_VC.TOXIC.fg],
            ].map(([l, val, col], i, arr) => (
              <div key={l} style={{
                padding:'8px 10px',
                borderRight: i < arr.length - 1 ? `1px solid ${tm.line}` : 'none',
              }}>
                <div style={{ font:`9.5px/1 ${tm.mono}`, color: tm.inkFaint, letterSpacing:'0.18em' }}>{l}</div>
                <div style={{ font:`300 20px/1 ${tm.mono}`, color: col, marginTop: 3, fontVariantNumeric:'tabular-nums' }}>{val}</div>
              </div>
            ))}
          </div>
        </MCard>

        {/* ============ PHASE SPACE ============ */}
        <MCard title="Phase space" hint="intent × integrity">
          <MPhase result={result} c={c} />
          <div style={{ display:'flex', flexWrap:'wrap', gap: 10, marginTop: 8, font:`10px/1 ${tm.mono}` }}>
            <span style={{ color: tm.ink, display:'inline-flex', alignItems:'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius:'50%', background: vc.fg }} />v11 mixed
            </span>
            <span style={{ color: tm.inkDim, display:'inline-flex', alignItems:'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius:'50%', border:`1.2px solid ${tm.inkDim}` }} />v10 pure
            </span>
            <span style={{ color: tm.inkDim, display:'inline-flex', alignItems:'center', gap: 4 }}>
              <span style={{ width: 12, height: 6, background: vc.fg, opacity: 0.3 }} />envelope
            </span>
            <span style={{ color: tm.risk, display:'inline-flex', alignItems:'center', gap: 4 }}>
              <span style={{ width: 12, height: 1.5, background: tm.risk }} />τ
            </span>
          </div>
        </MCard>

        {/* ============ BRAKE — only shown when active ============ */}
        {brakeActive && (
          <MCard accent={TM_VC.TOXIC.fg}>
            <div style={{
              background:'rgba(255,92,108,0.10)', border:`1px solid ${TM_VC.TOXIC.fg}55`,
              padding:'10px 12px',
            }}>
              <div style={{ font:`600 10px/1 ${tm.mono}`, color: TM_VC.TOXIC.fg, letterSpacing:'0.18em' }}>
                {result.flags.toxic_veto && '◆ TOXIC VETO'}
                {result.flags.emergency_override && '◆ EMERGENCY OVERRIDE'}
                {result.flags.low_confidence_brake && '◆ LOW-CONFIDENCE BRAKE'}
                {result.flags.one_way_brake && !result.flags.low_confidence_brake && '◆ ONE-WAY BRAKE'}
              </div>
              <div style={{ font:`italic 12px/1.45 ${tm.serif}`, color: tm.ink, marginTop: 6 }}>
                {result.flags.low_confidence_brake && 'Integrity-axis inputs (Sp, St) are guesses on an irreversible decision. v11 forces ESCALATE regardless of point estimates.'}
                {!result.flags.low_confidence_brake && result.flags.one_way_brake && 'Decision is irreversible with weak integrity foundation. Human authorization required.'}
                {result.flags.toxic_veto && 'Low integrity × high risk. No autonomous action under any circumstance.'}
                {result.flags.emergency_override && 'High urgency on irreversible decision. Cannot WAIT for data; routing to human.'}
              </div>
            </div>
          </MCard>
        )}

        {/* ============ INPUTS ============ */}
        <MCard title="Inputs" hint="value · data quality" accent={tm.accent}>
          <div>
            {inputDefs.map((d, i) => (
              <MInputRow key={d.k}
                symbol={d.k} label={d.label} sub={d.sub}
                value={v[d.k]} conf={c[d.k]} unlocked={unlocked[d.k]}
                axisColor={d.axis} isLast={i === inputDefs.length - 1}
                onValue={(val) => updateValue(d.k, val)}
                onConf={(val) => updateConfidence(d.k, val)}
                onRelockOne={() => relockOne(d.k)} />
            ))}
          </div>
        </MCard>

        {/* ============ MASTER QUALITY ============ */}
        <MCard title="Master data quality" hint="global · all inputs" accent={tm.accent}>
          <MMasterDial value={masterC} onChange={updateMaster} hasUnlocked={hasUnlocked} onRelock={relock} />
        </MCard>

        {/* ============ THRESHOLD ============ */}
        <MCard title="Threshold τ" hint={tauMode === 'auto' ? 'AUTO' : 'MANUAL'}>
          <div style={{ display:'flex', border:`1px solid ${tm.line}` }}>
            {['auto','manual'].map(m => (
              <button key={m} onClick={() => setTauMode(m)} style={{
                flex: 1, background: tauMode === m ? tm.accent : 'transparent',
                color: tauMode === m ? '#000' : tm.ink, border:'none',
                font:`600 11px/1 ${tm.mono}`, letterSpacing:'0.14em',
                padding:'8px 0', cursor:'pointer',
              }}>{m.toUpperCase()}</button>
            ))}
          </div>
          {tauMode === 'manual' ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', font:`13px ${tm.mono}`, marginBottom: 4 }}>
                <span style={{ color: tm.inkDim }}>τ manual</span>
                <span>{v11_fmt(tauManual, 3)}</span>
              </div>
              <input type="range" min="0" max="0.9" step="0.01" value={tauManual}
                onChange={e => setTauManual(parseFloat(e.target.value))}
                style={{ width:'100%', accentColor: tm.accent, color: tm.accent, height: 5 }} />
            </div>
          ) : (
            <div style={{ marginTop: 8, font:`11.5px/1.5 ${tm.mono}`, color: tm.inkDim }}>
              τ = 0.25 + 0.35·S(ρ) + 0.25·R − 0.15·ρ <br/>
              = <span style={{ color: tm.ink }}>{v11_fmt(result.tau, 3)}</span>
              <span style={{ color: tm.inkFaint }}> · pure {v11_fmt(result.tau_pure, 3)}</span>
            </div>
          )}
        </MCard>

        {/* ============ SCENARIO PICKER (collapsible) ============ */}
        <MCard>
          <button onClick={() => setScenarioOpen(o => !o)} style={{
            width:'100%', background:'transparent', border:'none',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding: 0, cursor:'pointer', color: tm.ink,
          }}>
            <div style={{ textAlign:'left' }}>
              <div style={{ font:`9.5px/1 ${tm.mono}`, color: tm.inkFaint, letterSpacing:'0.18em' }}>SCENARIO</div>
              <div style={{ font:`500 14px/1.2 ${tm.serif}`, marginTop: 4 }}>{scenarios.find(s => s.id === scenarioId)?.name}</div>
            </div>
            <span style={{ color: tm.inkDim, font:`14px ${tm.mono}` }}>{scenarioOpen ? '▾' : '▸'}</span>
          </button>
          {scenarioOpen && (
            <div style={{ marginTop: 10, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6 }}>
              {scenarios.map(s => (
                <button key={s.id} onClick={() => { applyScenario(s.id); setScenarioOpen(false); }} style={{
                  background: scenarioId === s.id ? 'rgba(245,185,66,0.10)' : 'transparent',
                  border:`1px solid ${scenarioId === s.id ? tm.accent : tm.line}`,
                  color: tm.ink, font:`500 11px/1.3 ${tm.sans}`,
                  padding:'7px 9px', textAlign:'left', cursor:'pointer',
                }}>
                  <div style={{ color: scenarioId === s.id ? tm.accent : tm.ink }}>{s.name}</div>
                  <div style={{ font:`italic 10px/1.2 ${tm.serif}`, color: tm.inkDim, marginTop: 2 }}>{s.subtitle}</div>
                </button>
              ))}
            </div>
          )}
        </MCard>

        {/* ============ DETAILS — tabbed (Provenance / History / Brakes) ============ */}
        <MCard>
          <div style={{ display:'flex', borderBottom:`1px solid ${tm.line}`, marginBottom: 10 }}>
            {[
              ['provenance', 'Provenance'],
              ['history',    'History'],
              ['flags',      'Flags'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, background:'transparent', border:'none',
                color: tab === id ? tm.accent : tm.inkDim,
                borderBottom: tab === id ? `2px solid ${tm.accent}` : '2px solid transparent',
                marginBottom: -1,
                font:`500 11px/1 ${tm.mono}`, letterSpacing:'0.16em',
                padding:'8px 0', cursor:'pointer', textTransform:'uppercase',
              }}>{label}</button>
            ))}
          </div>

          {tab === 'provenance' && (
            <div style={{ display:'flex', flexDirection:'column', font:`11.5px/1.45 ${tm.mono}` }}>
              <div style={{
                padding:'7px 10px', marginBottom: 6,
                background:'rgba(245,185,66,0.07)', border:`1px solid ${tm.accent}33`,
              }}>
                <div style={{ font:`9.5px/1 ${tm.mono}`, color: tm.inkFaint, letterSpacing:'0.16em', marginBottom: 4 }}>v11 DENSITY MATRIX</div>
                <div style={{ font:`500 13px/1.3 ${tm.mono}`, color: tm.ink }}>
                  ρ = C · ρ<sub style={{ fontSize:9 }}>pure</sub> + (1 − C) · <span style={{ fontStyle:'italic' }}>I</span>/2
                </div>
                <div style={{ font:`italic 10.5px/1.4 ${tm.serif}`, color: tm.inkDim, marginTop: 3 }}>
                  Convex combination with maximally mixed state. C = {v11_fmt(result.aggregate_C, 3)}.
                </div>
              </div>
              {[
                ['aggregate C',         v11_fmt(result.aggregate_C, 4),  'shrinkage factor'],
                ['|r|_pure → |r|_mixed', `${v11_fmt(result.bloch_pure.magnitude, 4)} → ${v11_fmt(result.bloch.magnitude, 4)}`, `Δ ${v11_fmt(result.bloch.magnitude - result.bloch_pure.magnitude, 4)}`],
                ['entropy Δ from pure',  `${(result.entropy - result.entropy_pure) >= 0 ? '+' : ''}${v11_fmt(result.entropy - result.entropy_pure, 4)}`, 'S(ρ) widening'],
                ['τ Δ from pure',        `${(result.tau - result.tau_pure) >= 0 ? '+' : ''}${v11_fmt(result.tau - result.tau_pure, 4)}`, 'threshold shift'],
                ['verdict Δ',            result.verdict_changed ? 'YES' : 'no', result.verdict_changed ? 'v10 → v11 flip' : 'same as v10'],
              ].map(([l, val, meta], i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'1fr auto', gap: 6, alignItems:'baseline',
                  padding:'5px 0', borderTop: i ? `1px solid ${tm.line}` : 'none',
                }}>
                  <div>
                    <div style={{ color: tm.inkDim, fontSize: 10.5 }}>{l}</div>
                    <div style={{ color: tm.inkFaint, fontSize: 10, marginTop: 2 }}>{meta}</div>
                  </div>
                  <span style={{ color: l === 'verdict Δ' && result.verdict_changed ? tm.accent : tm.ink, fontVariantNumeric:'tabular-nums' }}>{val}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div style={{ display:'flex', flexDirection:'column', font:`11px/1.4 ${tm.mono}` }}>
              {history.slice().reverse().map((h, i) => {
                const hc = TM_VC[h.result.decision];
                const mins = Math.round((Date.now() - h.t) / 60000);
                return (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'40px 1fr auto auto', gap: 8, alignItems:'center',
                    padding:'6px 0', borderTop: i ? `1px solid ${tm.line}` : 'none',
                  }}>
                    <span style={{ color: tm.inkFaint }}>{mins}m</span>
                    <span style={{ color: tm.ink }}>{h.label}</span>
                    <span style={{ color: v11_qualityColor(h.result.aggregate_C) }}>C {Math.round(h.result.aggregate_C*100)}</span>
                    <span style={{ color: hc.fg, fontWeight: 600, fontSize: 10, letterSpacing:'0.12em' }}>{h.result.decision}</span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'flags' && (
            <div style={{ display:'flex', flexDirection:'column', font:`11.5px/1.5 ${tm.mono}` }}>
              {[
                ['Toxic veto',           result.flags.toxic_veto],
                ['Emergency override',   result.flags.emergency_override],
                ['One-Way Brake',        result.flags.one_way_brake],
                ['Low-conf brake (v11)', result.flags.low_confidence_brake],
                ['EV block',             result.flags.ev_block],
              ].map(([l, on], i) => (
                <div key={l} style={{
                  display:'grid', gridTemplateColumns:'1fr auto',
                  padding:'7px 0', borderTop: i ? `1px solid ${tm.line}` : 'none',
                }}>
                  <span style={{ color: on ? TM_VC.TOXIC.fg : tm.inkDim }}>{l}</span>
                  <span style={{ color: on ? TM_VC.TOXIC.fg : tm.inkGhost }}>{on ? 'FIRED' : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </MCard>

        <footer style={{
          padding:'10px 4px 0', font:`9.5px/1.4 ${tm.mono}`, color: tm.inkFaint, textAlign:'center',
        }}>
          NERVA v11 · mixed-state decision integrity engine<br/>
          Nielsen &amp; Chuang Ch. 11 · Shannon 1948 · Baumgratz–Cramer–Plenio 2014
        </footer>
      </main>
    </div>
  );
}

window.NervaV11Mobile = NervaV11Mobile;
