// variation-v11.jsx — NERVA v11 cockpit, redesigned.
// Hero: anisotropic phase-space envelope. Story: pure vs mixed counterfactual.

const { useState: uV11s, useEffect: uV11e, useMemo: uV11m, useRef: uV11r } = React;

// ---------------------------------------------------------------
// TOKENS
// ---------------------------------------------------------------
const t11 = {
  bg: '#0a0e15',
  surface: '#11161f',
  surfaceHi: '#161c27',
  surfaceLo: '#080b11',
  ink: '#e8e3d8',
  inkDim: 'rgba(232,227,216,0.62)',
  inkFaint: 'rgba(232,227,216,0.36)',
  inkGhost: 'rgba(232,227,216,0.18)',
  line: 'rgba(232,227,216,0.08)',
  lineHi: 'rgba(232,227,216,0.18)',
  accent: '#f5b942',     // confidence amber — the v11 signature
  signal: '#4cc9f0',     // |r| / decision signal
  intent: '#a78bfa',     // intent axis
  integrity: '#3ddc97',  // integrity axis
  risk: '#ff5c6c',       // risk axis
  serif: '"Newsreader", Georgia, serif',
  sans: '"IBM Plex Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

const V11_VC = {
  COMMIT:   { fg: '#3ddc97', bg: 'rgba(61,220,151,0.08)' },
  HOLD:     { fg: '#f5b942', bg: 'rgba(245,185,66,0.08)' },
  WAIT:     { fg: '#7aa7ff', bg: 'rgba(122,167,255,0.08)' },
  ESCALATE: { fg: '#ff9a3c', bg: 'rgba(255,154,60,0.10)' },
  TOXIC:    { fg: '#ff5c6c', bg: 'rgba(255,92,108,0.12)' },
};

// ---------------------------------------------------------------
// Tiny pieces
// ---------------------------------------------------------------
function V11Panel({ title, hint, accent, children, style }) {
  return (
    <div style={{
      background: t11.surface, border: `1px solid ${t11.line}`,
      display:'flex', flexDirection:'column', minHeight: 0,
      ...(accent ? { borderTop: `2px solid ${accent}` } : {}),
      ...style,
    }}>
      {title && (
        <div style={{
          display:'flex', alignItems:'baseline', justifyContent:'space-between',
          padding:'8px 12px 6px', gap: 8,
        }}>
          <span style={{ font:`500 9.5px/1 ${t11.mono}`, color: t11.inkDim, letterSpacing:'0.18em' }}>{title}</span>
          {hint && <span style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.08em' }}>{hint}</span>}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, padding: '4px 12px 12px', display:'flex', flexDirection:'column' }}>
        {children}
      </div>
    </div>
  );
}

// Paired value+confidence slider row — v11 signature input
function V11InputRow({ symbol, label, sub, value, conf, unlocked, axisColor, masterC, onValue, onConf }) {
  const qColor = v11_qualityColor(conf);
  const masterPercent = (masterC * 100).toFixed(1);
  return (
    <div style={{
      padding: '10px 12px', borderTop: `1px solid ${t11.line}`,
      background: 'transparent',
    }}>
      <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ font:`600 12px/1 ${t11.mono}`, color: axisColor, letterSpacing:'0.04em', width: 22 }}>{symbol}</span>
        <span style={{ font:`500 12.5px/1 ${t11.sans}`, color: t11.ink }}>{label}</span>
        <span style={{ marginLeft:'auto', font:`500 14px/1 ${t11.mono}`, color: t11.ink, fontVariantNumeric:'tabular-nums' }}>{v11_fmt(value, 2)}</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={value}
        onChange={e => onValue(parseFloat(e.target.value))}
        style={{ width:'100%', color: axisColor, accentColor: axisColor, height: 4 }} />
      <div style={{ font:`10px/1.2 ${t11.sans}`, color: t11.inkFaint, marginTop: 3 }}>{sub}</div>

      {/* confidence sub-slider */}
      <div style={{ marginTop: 7, paddingTop: 7, borderTop:`1px dashed ${t11.line}` }}>
        <div style={{ display:'flex', alignItems:'baseline', gap: 6, marginBottom: 3 }}>
          <span style={{ font:`500 9px/1 ${t11.mono}`, color: t11.inkDim, letterSpacing:'0.14em' }}>DATA QUALITY</span>
          <span style={{ font:`500 9px/1 ${t11.mono}`, color: qColor, letterSpacing:'0.14em', marginLeft: 4 }}>
            {v11_qualityLabel(conf)}
          </span>
          {unlocked && (
            <span style={{
              font:`700 9px/1 ${t11.mono}`, color: t11.accent, marginLeft: 6,
              letterSpacing:'0.18em',
              padding: '2px 5px',
              border: `1px solid ${t11.accent}88`,
              background: 'rgba(245,185,66,0.10)',
              borderRadius: 1,
            }}>OVERRIDDEN</span>
          )}
          <span style={{ marginLeft:'auto', font:`12px/1 ${t11.mono}`, color: qColor }}>{Math.round(conf*100)}<span style={{ color: t11.inkFaint }}>%</span></span>
        </div>
        <div style={{ position: 'relative' }}>
          <input type="range" min="0" max="1" step="0.01" value={conf}
            onChange={e => onConf(parseFloat(e.target.value))}
            className="nerva-conf-slider"
            style={{ width:'100%', color: qColor, accentColor: qColor, height: 2 }} />
          {unlocked && (
            <div
              title={`master is at ${masterPercent}%`}
              style={{
                position: 'absolute',
                left: `calc(${masterPercent}% - 1px)`,
                top: -3,
                width: 2,
                height: 14,
                background: t11.accent,
                opacity: 0.55,
                pointerEvents: 'none',
                transition: 'left 200ms ease',
              }}
            >
              <div style={{
                position: 'absolute',
                top: -4, left: -3,
                width: 8, height: 8,
                border: `1px solid ${t11.accent}`,
                borderRadius: '50%',
                opacity: 0.8,
                boxSizing: 'border-box',
                background: t11.bg,
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Master quality dial — bigger, more distinctive than the prototype
function MasterDial({ value, onChange, hasUnlocked, unlockedCount, totalCount, onRelock }) {
  const lockedCount = totalCount - unlockedCount;
  let statusColor, statusText;
  if (unlockedCount === 0) {
    statusColor = t11.inkDim;
    statusText = `MASTER ACTIVE · ${totalCount}/${totalCount} FOLLOW`;
  } else if (unlockedCount === totalCount) {
    statusColor = '#ff9a3c';
    statusText = `MASTER INACTIVE · ${totalCount}/${totalCount} OVERRIDDEN`;
  } else {
    statusColor = t11.accent;
    statusText = `${lockedCount}/${totalCount} FOLLOW · ${unlockedCount} OVERRIDDEN`;
  }
  const size = 130;
  const cx = size/2, cy = size/2;
  const rOuter = 54, rInner = 44;
  const startA = 135, endA = 405;
  const valA = startA + (endA - startA) * value;
  const ticks = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const ang = (startA + (endA - startA) * t) * Math.PI / 180;
    const major = i % 6 === 0;
    const r1 = rOuter + 1, r2 = rOuter + (major ? 7 : 3);
    const active = t <= value;
    ticks.push(<line key={i}
      x1={cx + Math.cos(ang)*r1} y1={cy + Math.sin(ang)*r1}
      x2={cx + Math.cos(ang)*r2} y2={cy + Math.sin(ang)*r2}
      stroke={active ? v11_qualityColor(t) : t11.inkGhost} strokeWidth={major ? 1.4 : 0.6} />);
  }
  // Arc from start to value
  const a0 = startA * Math.PI / 180, a1 = valA * Math.PI / 180;
  const large = (valA - startA) > 180 ? 1 : 0;
  const arcD = `M ${cx + Math.cos(a0)*rInner} ${cy + Math.sin(a0)*rInner}
                A ${rInner} ${rInner} 0 ${large} 1 ${cx + Math.cos(a1)*rInner} ${cy + Math.sin(a1)*rInner}`;
  const valAR = valA * Math.PI / 180;
  const arcColor = v11_qualityColor(value);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ position:'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ position:'absolute', inset: 0 }}>
          {ticks}
          <path d={arcD} fill="none" stroke={arcColor} strokeWidth="2.5" strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={cx + Math.cos(valAR) * (rInner - 4)} y2={cy + Math.sin(valAR) * (rInner - 4)}
            stroke={arcColor} strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" fill={t11.bg} stroke={arcColor} strokeWidth="1.5" />
        </svg>
        <div style={{ position:'absolute', inset: 0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ font:`300 26px/1 ${t11.mono}`, color: t11.ink, fontVariantNumeric:'tabular-nums' }}>{Math.round(value*100)}</div>
          <div style={{ font:`9px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.18em', marginTop: 2 }}>%</div>
        </div>
      </div>
      <div style={{ font:`500 10px/1 ${t11.mono}`, color: arcColor, letterSpacing:'0.2em', marginTop: 4 }}>
        {v11_qualityLabel(value)}
      </div>
      <input type="range" min="0" max="1" step="0.01" value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:'100%', color: arcColor, accentColor: arcColor, marginTop: 10 }} />
      <div style={{
        marginTop: 8, padding: '4px 8px',
        font:`600 9px/1.2 ${t11.mono}`, color: statusColor,
        letterSpacing:'0.14em', textAlign:'center',
        border: `1px solid ${statusColor}33`,
        background: unlockedCount === totalCount ? 'rgba(255,154,60,0.06)' : 'transparent',
        width: '100%',
        borderRadius: 1,
      }}>
        {statusText}
      </div>
      <button onClick={onRelock} disabled={!hasUnlocked} style={{
        marginTop: 6, width:'100%', background: hasUnlocked ? 'transparent' : 'transparent',
        color: hasUnlocked ? t11.accent : t11.inkGhost,
        border: `1px solid ${hasUnlocked ? `${t11.accent}55` : t11.line}`,
        font:`600 10px/1 ${t11.mono}`, letterSpacing:'0.14em',
        padding:'6px 0', cursor: hasUnlocked ? 'pointer' : 'not-allowed', borderRadius: 2,
      }}>↺ RELOCK ALL TO MASTER</button>
    </div>
  );
}

// ---------------------------------------------------------------
// PHASE SPACE — the v11 hero
// Anisotropic envelope based on per-input confidences.
// X = intent axis (r_x), Y = integrity axis (r_z).
// ---------------------------------------------------------------
function V11PhaseSpace({ result, c }) {
  const W = 520, H = 380;
  const M = { l: 46, r: 24, t: 24, b: 36 };
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  // We work in normalized Bloch coords. Pure |r| ≤ 1 by construction, so map -0.6..0.6 to viewport
  // (the actual values rarely exceed 0.6 for plausible inputs).
  const DOMAIN = 0.68;
  const xp = (v) => M.l + ((v + 0) / DOMAIN) * pw;       // r_x is non-negative here
  const yp = (v) => M.t + (1 - (v / DOMAIN)) * ph;

  const pure = result.bloch_pure;
  const mixed = result.bloch;
  const vc = V11_VC[result.decision];

  // Anisotropic per-axis "geometric confidence":
  //   x-axis (intent) := (c_E + c_S) / 2     → x stretch = 1 - that
  //   y-axis (integrity) := c_Sp · c_St      → y stretch = 1 - that
  const cIntent = (c.E + c.S) / 2;
  const cInteg = c.Sp * c.St;
  // envelope semi-axes in Bloch space, capped to keep on-canvas
  const rx_bloch = Math.min(0.28, (1 - cIntent) * 0.38);
  const ry_bloch = Math.min(0.28, (1 - cInteg) * 0.38);
  // convert to screen units (linear scale)
  const rx_screen = (rx_bloch / DOMAIN) * pw;
  const ry_screen = (ry_bloch / DOMAIN) * ph;

  const purePx = xp(pure.r_x), purePy = yp(pure.r_z);
  const mixedPx = xp(mixed.r_x), mixedPy = yp(mixed.r_z);

  // τ as a curved |r| boundary (radial from origin)
  const tau = result.tau;
  const tauScreenR = (tau / DOMAIN) * Math.min(pw, ph); // approximate, since our axes aren't isotropic
  const originPx = xp(0), originPy = yp(0);

  // Zone backdrops
  // ESCALATE: high y (integrity weak, here means y<low so flip semantic);  here y = r_z which is HIGH for high integrity.
  // We zone visually around (intent x integrity):
  //   top region (high integrity) → COMMIT
  //   middle → HOLD
  //   bottom → WAIT/ESCALATE
  const zones = [
    { y0: 0,        h: ph * 0.32, fg: V11_VC.COMMIT.fg, label: 'COMMIT' },
    { y0: ph*0.32, h: ph * 0.28, fg: V11_VC.HOLD.fg,   label: 'HOLD' },
    { y0: ph*0.60, h: ph * 0.18, fg: V11_VC.WAIT.fg,   label: 'WAIT' },
    { y0: ph*0.78, h: ph * 0.22, fg: V11_VC.ESCALATE.fg, label: 'ESCALATE' },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width:'100%', height:'100%', display:'block' }}>
      <defs>
        <radialGradient id="env-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={vc.fg} stopOpacity="0.35" />
          <stop offset="65%" stopColor={vc.fg} stopOpacity="0.12" />
          <stop offset="100%" stopColor={vc.fg} stopOpacity="0" />
        </radialGradient>
        <pattern id="ps-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={t11.line} strokeWidth="0.6" />
        </pattern>
      </defs>

      {/* zones */}
      {zones.map((z, i) => (
        <g key={i}>
          <rect x={M.l} y={M.t + z.y0} width={pw} height={z.h} fill={z.fg} opacity="0.04" />
          <text x={M.l + pw - 6} y={M.t + z.y0 + 12} textAnchor="end"
            style={{ font:`600 9.5px ${t11.mono}`, fill: z.fg, opacity: 0.5, letterSpacing:'0.2em' }}>
            {z.label}
          </text>
        </g>
      ))}

      {/* grid */}
      <rect x={M.l} y={M.t} width={pw} height={ph} fill="url(#ps-grid)" />

      {/* axes */}
      <line x1={M.l} y1={M.t} x2={M.l} y2={M.t+ph} stroke={t11.lineHi} strokeWidth="1" />
      <line x1={M.l} y1={M.t+ph} x2={M.l+pw} y2={M.t+ph} stroke={t11.lineHi} strokeWidth="1" />

      {/* τ boundary — circular from origin (bottom-left), approximate */}
      <circle cx={originPx} cy={originPy} r={tauScreenR} fill="none"
        stroke={t11.inkDim} strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
      <text x={originPx + tauScreenR * 0.707 + 6} y={originPy - tauScreenR * 0.707 - 4}
        style={{ font:`9.5px ${t11.mono}`, fill: t11.inkDim }}>
        τ = {v11_fmt(tau, 3)}
      </text>

      {/* axis ticks */}
      {[0, 0.2, 0.4, 0.6].map(t => (
        <g key={t}>
          <text x={xp(t)} y={M.t + ph + 14} textAnchor="middle" style={{ font:`9.5px ${t11.mono}`, fill: t11.inkFaint }}>{t.toFixed(1)}</text>
          <text x={M.l - 6} y={yp(t) + 3} textAnchor="end" style={{ font:`9.5px ${t11.mono}`, fill: t11.inkFaint }}>{t.toFixed(1)}</text>
        </g>
      ))}
      <text x={M.l + pw/2} y={H - 6} textAnchor="middle" style={{ font:`italic 11px ${t11.serif}`, fill: t11.inkDim }}>
        intent  r_x = (E+S) / 2√3
      </text>
      <text x={12} y={M.t + ph/2} textAnchor="middle" transform={`rotate(-90 12 ${M.t + ph/2})`}
        style={{ font:`italic 11px ${t11.serif}`, fill: t11.inkDim }}>
        integrity  r_z = (Sp · St) / √3
      </text>

      {/* Anisotropic envelope */}
      <ellipse cx={mixedPx} cy={mixedPy} rx={rx_screen} ry={ry_screen}
        fill="url(#env-grad)" stroke={vc.fg} strokeWidth="0.8" strokeOpacity="0.55"
        strokeDasharray="2 3" />

      {/* axis-aligned uncertainty lines through the mixed dot, lengths proportional to per-axis (1-c) */}
      <line x1={mixedPx - rx_screen} y1={mixedPy} x2={mixedPx + rx_screen} y2={mixedPy}
        stroke={t11.intent} strokeWidth="1" opacity="0.55" />
      <line x1={mixedPx} y1={mixedPy - ry_screen} x2={mixedPx} y2={mixedPy + ry_screen}
        stroke={t11.integrity} strokeWidth="1" opacity="0.55" />
      {/* per-axis tick caps */}
      {[-1,1].map(s => (
        <g key={s}>
          <line x1={mixedPx + s*rx_screen} y1={mixedPy - 3} x2={mixedPx + s*rx_screen} y2={mixedPy + 3} stroke={t11.intent} strokeWidth="1" opacity="0.6" />
          <line x1={mixedPx - 3} y1={mixedPy + s*ry_screen} x2={mixedPx + 3} y2={mixedPy + s*ry_screen} stroke={t11.integrity} strokeWidth="1" opacity="0.6" />
        </g>
      ))}

      {/* pure → mixed vector */}
      <line x1={purePx} y1={purePy} x2={mixedPx} y2={mixedPy}
        stroke={t11.inkDim} strokeWidth="1" strokeDasharray="2 2" />
      {/* pure ghost */}
      <circle cx={purePx} cy={purePy} r="5" fill="none" stroke={t11.inkDim} strokeWidth="1.2" />
      <text x={purePx + 8} y={purePy - 6}
        style={{ font:`italic 10.5px ${t11.serif}`, fill: t11.inkDim }}>
        r₀ · v10 pure state
      </text>

      {/* mixed dot — the verdict dot */}
      <circle cx={mixedPx} cy={mixedPy} r="6.5" fill={vc.fg} stroke={t11.bg} strokeWidth="1.5" />
      <text x={mixedPx + 10} y={mixedPy + 4}
        style={{ font:`600 11px ${t11.mono}`, fill: vc.fg, letterSpacing:'0.12em' }}>
        {result.decision}
      </text>

      {/* readouts top-left */}
      <text x={M.l + 8} y={M.t + 14} style={{ font:`9.5px ${t11.mono}`, fill: t11.inkDim, letterSpacing:'0.1em' }}>|r|_pure</text>
      <text x={M.l + 8} y={M.t + 26} style={{ font:`400 14px ${t11.mono}`, fill: t11.inkDim }}>{v11_fmt(pure.magnitude, 3)}</text>
      <text x={M.l + 70} y={M.t + 14} style={{ font:`9.5px ${t11.mono}`, fill: vc.fg, letterSpacing:'0.1em' }}>|r|_mixed</text>
      <text x={M.l + 70} y={M.t + 26} style={{ font:`400 14px ${t11.mono}`, fill: vc.fg }}>{v11_fmt(mixed.magnitude, 3)}</text>
    </svg>
  );
}

// ---------------------------------------------------------------
// HEADER METRICS BAR (|r|, τ, Δ, EV, S(ρ), C)
// ---------------------------------------------------------------
function V11Stat({ label, value, sub, color, big }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', borderRight:`1px solid ${t11.line}`, padding:'4px 14px', minWidth: 70 }}>
      <span style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.18em' }}>{label}</span>
      <span style={{ font:`300 ${big ? 26 : 18}px/1 ${t11.mono}`, color: color || t11.ink, marginTop: 3, fontVariantNumeric:'tabular-nums' }}>{value}</span>
      {sub && <span style={{ font:`italic 10px/1.2 ${t11.serif}`, color: t11.inkDim, marginTop: 2 }}>{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------
// MAIN VIEW
// ---------------------------------------------------------------
function NervaV11Cockpit() {
  const {
    v, c, unlocked, masterC, kernel, tauMode, tauManual, scenarioId, scenario,
    result, history, api, scenarios,
    updateValue, updateConfidence, updateMaster, relock, applyScenario,
    setTauMode, setTauManual, setKernel, setScenario,
  } = useNervaV11();
  const vc = V11_VC[result.decision];
  const vcPure = V11_VC[result.pure_verdict];
  const hasUnlocked = Object.values(unlocked).some(Boolean);
  const unlockedCount = Object.values(unlocked).filter(Boolean).length;
  const totalCount = Object.keys(unlocked).length;

  const inputDefs = [
    { k: 'E',  label: 'Urgency',   sub: 'priority / time pressure',         axis: t11.risk },
    { k: 'S',  label: 'Strategy',  sub: 'plan quality / coherence',         axis: t11.intent },
    { k: 'R',  label: 'Risk',      sub: 'exposure to negative outcomes',    axis: t11.risk },
    { k: 'Sp', label: 'Support',   sub: 'evidence / data confidence',       axis: t11.integrity },
    { k: 'St', label: 'Stability', sub: 'environment / system health',      axis: t11.integrity },
  ];

  // Brake banner: severity-driven background
  const brakeActive = result.flags.toxic_veto || result.flags.emergency_override || result.flags.one_way_brake || result.flags.low_confidence_brake;

  return (
    <div style={{
      width:'100%', height:'100%', background: t11.bg, color: t11.ink,
      fontFamily: t11.sans, display:'grid', gridTemplateRows:'40px 1fr', overflow:'hidden',
    }}>
      {/* ============ TOP BAR ============ */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 18px', borderBottom: `1px solid ${t11.line}`, background: t11.surfaceLo,
        font:`11px/1 ${t11.mono}`, letterSpacing:'0.12em',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: 18 }}>
          <span style={{ color: t11.accent, fontWeight: 600, letterSpacing:'0.36em' }}>NERVA</span>
          <span style={{ color: t11.ink }}>v11.0</span>
          <span style={{ color: t11.inkFaint }}>·</span>
          <span style={{ color: t11.inkDim }}>MIXED-STATE COCKPIT</span>
          <span style={{ color: t11.inkFaint }}>·</span>
          <span style={{ color: t11.inkDim }}>STARPOINT LLC</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 16 }}>
          {/* kernel toggle */}
          <div style={{ display:'flex', alignItems:'center', gap: 4 }}>
            <span style={{ color: t11.inkFaint }}>KERNEL</span>
            {['v11','v10'].map(k => (
              <button key={k} onClick={() => setKernel(k)} style={{
                background: kernel === k ? t11.accent : 'transparent',
                color: kernel === k ? '#000' : t11.inkDim,
                border: `1px solid ${kernel === k ? t11.accent : t11.line}`,
                font:`600 10px/1 ${t11.mono}`, letterSpacing:'0.14em',
                padding:'4px 9px', cursor:'pointer',
              }}>{k.toUpperCase()}</button>
            ))}
          </div>
          <span style={{ color: V11_VC.COMMIT.fg }}>● {api.status.toUpperCase()}</span>
          <span style={{ color: t11.inkDim }}>{api.region}</span>
          <span style={{ color: t11.inkDim }}>{api.uptime}%</span>
        </div>
      </div>

      {/* ============ BODY ============ */}
      <div style={{
        display:'grid', gridTemplateColumns:'320px 1fr 340px',
        gridTemplateRows:'1fr', gap: 8, padding: 8, minHeight: 0,
      }}>
        {/* ============ LEFT — Scenario + Inputs ============ */}
        <div style={{ display:'flex', flexDirection:'column', gap: 8, minHeight: 0, overflow:'hidden' }}>
          <V11Panel title="Scenario" hint={scenarios.find(s=>s.id===scenarioId)?.name}>
            <textarea value={scenario} onChange={e => setScenario(e.target.value)}
              style={{
                background:'transparent', color: t11.ink, border:`1px solid ${t11.line}`,
                font:`12px/1.4 ${t11.sans}`, padding: 6, resize:'none', outline:'none',
                height: 78, marginBottom: 6,
              }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 4 }}>
              {scenarios.map(s => (
                <button key={s.id} onClick={() => applyScenario(s.id)} style={{
                  background: scenarioId === s.id ? 'rgba(245,185,66,0.10)' : 'transparent',
                  border:`1px solid ${scenarioId === s.id ? t11.accent : t11.line}`,
                  color: t11.ink, font:`500 10.5px/1.2 ${t11.sans}`,
                  padding:'5px 7px', textAlign:'left', cursor:'pointer',
                }}>
                  <div style={{ color: scenarioId === s.id ? t11.accent : t11.ink }}>{s.name}</div>
                  <div style={{ font:`italic 9.5px/1.2 ${t11.serif}`, color: t11.inkDim, marginTop: 2 }}>{s.subtitle}</div>
                </button>
              ))}
            </div>
          </V11Panel>

          <V11Panel title="Inputs" hint="value × data quality" style={{ flex: 1, overflowY:'auto' }} accent={t11.accent}>
            <div style={{ margin:'0 -12px' }}>
              {inputDefs.map(d => (
                <V11InputRow key={d.k}
                  symbol={d.k} label={d.label} sub={d.sub}
                  value={v[d.k]} conf={c[d.k]} unlocked={unlocked[d.k]}
                  axisColor={d.axis}
                  masterC={masterC}
                  onValue={(val) => updateValue(d.k, val)}
                  onConf={(val) => updateConfidence(d.k, val)} />
              ))}
            </div>
          </V11Panel>

          <V11Panel title="Threshold τ" hint={tauMode === 'auto' ? 'AUTO' : 'MANUAL'}>
            <div style={{ display:'flex', gap: 4, marginBottom: 6 }}>
              {['auto','manual'].map(m => (
                <button key={m} onClick={() => setTauMode(m)} style={{
                  flex: 1, background: tauMode === m ? t11.accent : 'transparent',
                  color: tauMode === m ? '#000' : t11.ink,
                  border:`1px solid ${tauMode === m ? t11.accent : t11.line}`,
                  font:`600 10px/1 ${t11.mono}`, letterSpacing:'0.14em',
                  padding:'5px 0', cursor:'pointer',
                }}>{m.toUpperCase()}</button>
              ))}
            </div>
            {tauMode === 'manual' ? (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', font:`12px ${t11.mono}` }}>
                  <span style={{ color: t11.inkDim }}>τ</span>
                  <span>{v11_fmt(tauManual, 3)}</span>
                </div>
                <input type="range" min="0" max="0.9" step="0.01" value={tauManual}
                  onChange={e => setTauManual(parseFloat(e.target.value))}
                  style={{ width:'100%', color: t11.accent, accentColor: t11.accent }} />
              </div>
            ) : (
              <div style={{ font:`11px/1.45 ${t11.mono}`, color: t11.inkDim }}>
                τ = 0.25 + 0.35·S(ρ) + 0.25·R − 0.15·ρ <br/>
                = <span style={{ color: t11.ink }}>{v11_fmt(result.tau, 3)}</span>
                <span style={{ color: t11.inkFaint }}> · pure {v11_fmt(result.tau_pure, 3)}</span>
              </div>
            )}
          </V11Panel>
        </div>

        {/* ============ CENTER — Verdict + Phase Space ============ */}
        <div style={{ display:'grid', gridTemplateRows:'auto 1fr auto', gap: 8, minHeight: 0 }}>

          {/* VERDICT BANNER */}
          <div style={{
            background: t11.surface, border:`1px solid ${t11.line}`, borderTop: `2px solid ${vc.fg}`,
            display:'grid', gridTemplateColumns:'auto 1fr auto', gap: 18, padding:'14px 18px', alignItems:'center',
          }}>
            {/* HUGE verdict */}
            <div>
              <div style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.22em', marginBottom: 2 }}>VERDICT · v11</div>
              <div style={{
                font:`200 64px/0.94 ${t11.serif}`, color: vc.fg, letterSpacing:'-0.03em',
              }}>
                {result.decision.charAt(0) + result.decision.slice(1).toLowerCase()}
              </div>
              {result.verdict_changed && (
                <div style={{
                  display:'inline-flex', alignItems:'center', gap: 5, marginTop: 5,
                  font:`600 9.5px/1 ${t11.mono}`, color: t11.accent, letterSpacing:'0.18em',
                  background:'rgba(245,185,66,0.12)', border:`1px solid ${t11.accent}55`,
                  padding:'4px 7px',
                }}>
                  Δ FROM v10 · was {result.pure_verdict}
                </div>
              )}
            </div>

            {/* prose + counterfactual */}
            <div style={{ minWidth: 0 }}>
              <div style={{ font:`13.5px/1.55 ${t11.serif}`, color: t11.ink, textWrap:'pretty' }}>
                {result.reason}
              </div>
              {result.verdict_changed && (
                <div style={{
                  display:'grid', gridTemplateColumns:'1fr 24px 1fr', gap: 12,
                  marginTop: 10, paddingTop: 8, borderTop:`1px solid ${t11.line}`,
                  alignItems:'center',
                }}>
                  <div>
                    <div style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.16em', marginBottom: 2 }}>v10 · PURE STATE</div>
                    <div style={{ font:`500 18px/1 ${t11.serif}`, color: vcPure.fg }}>{result.pure_verdict.charAt(0) + result.pure_verdict.slice(1).toLowerCase()}</div>
                    <div style={{ font:`11px/1.3 ${t11.mono}`, color: t11.inkDim, marginTop: 2 }}>
                      |r₀|={v11_fmt(result.bloch_pure.magnitude,3)} · τ={v11_fmt(result.tau_pure,3)}
                    </div>
                  </div>
                  <div style={{ font:`16px/1 ${t11.mono}`, color: t11.accent, textAlign:'center' }}>→</div>
                  <div>
                    <div style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.16em', marginBottom: 2 }}>v11 · MIXED STATE</div>
                    <div style={{ font:`500 18px/1 ${t11.serif}`, color: vc.fg }}>{result.decision.charAt(0) + result.decision.slice(1).toLowerCase()}</div>
                    <div style={{ font:`11px/1.3 ${t11.mono}`, color: t11.inkDim, marginTop: 2 }}>
                      |r|={v11_fmt(result.bloch.magnitude,3)} · τ={v11_fmt(result.tau,3)} · C={v11_fmt(result.aggregate_C,3)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* stats column */}
            <div style={{ display:'flex', flexDirection:'column', gap: 6, alignItems:'flex-end', textAlign:'right', minWidth: 130 }}>
              <div>
                <div style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.18em' }}>SIGNAL</div>
                <div style={{ font:`300 32px/1 ${t11.mono}`, color: vc.fg, fontVariantNumeric:'tabular-nums' }}>
                  {v11_fmt(result.bloch.magnitude, 3)}
                </div>
                <div style={{ font:`10.5px/1 ${t11.mono}`, color: t11.inkDim }}>τ <span style={{ color: t11.ink }}>{v11_fmt(result.tau,3)}</span></div>
              </div>
              <div style={{
                font:`11px/1 ${t11.mono}`,
                color: result.bloch.magnitude >= result.tau ? V11_VC.COMMIT.fg : V11_VC.WAIT.fg,
                letterSpacing:'0.14em',
              }}>
                Δ = {result.bloch.magnitude >= result.tau ? '+' : ''}{v11_fmt(result.bloch.magnitude - result.tau, 3)}
              </div>
            </div>
          </div>

          {/* PHASE SPACE + side stats */}
          <V11Panel title="Phase space · (intent × integrity) projection" hint={`envelope width = per-input data quality · not per-axis shrinkage`}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 168px', gap: 12, flex: 1, minHeight: 0 }}>
              <V11PhaseSpace result={result} c={c} />
              <div style={{ display:'flex', flexDirection:'column', gap: 10, fontSize: 11 }}>
                <div>
                  <div style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.16em' }}>LEGEND</div>
                  <div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 6, font:`11px/1 ${t11.mono}` }}>
                    <span style={{ width: 10, height: 10, borderRadius:'50%', background: vc.fg, border:`1px solid ${t11.bg}`, flex:'0 0 auto' }} />
                    <span style={{ color: t11.ink }}>mixed (v11) · used for verdict</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 4, font:`11px/1 ${t11.mono}` }}>
                    <span style={{ width: 10, height: 10, borderRadius:'50%', border:`1.2px solid ${t11.inkDim}`, flex:'0 0 auto' }} />
                    <span style={{ color: t11.inkDim }}>pure (v10) · ghost</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 4, font:`11px/1 ${t11.mono}` }}>
                    <span style={{ width: 14, height: 8, background: vc.fg, opacity: 0.3, flex:'0 0 auto' }} />
                    <span style={{ color: t11.inkDim }}>uncertainty envelope</span>
                  </div>
                </div>

                <div>
                  <div style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.16em' }}>PER-AXIS QUALITY</div>
                  {[
                    { k:'INTENT  (E+S)/2', val: (c.E + c.S)/2, color: t11.intent },
                    { k:'RISK         R',  val: c.R,            color: t11.risk },
                    { k:'INTEGRITY Sp·St', val: c.Sp * c.St,    color: t11.integrity },
                  ].map(row => (
                    <div key={row.k} style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 6 }}>
                      <span style={{ font:`10.5px/1 ${t11.mono}`, color: t11.inkDim, flex: 1, whiteSpace:'pre' }}>{row.k}</span>
                      <div style={{ position:'relative', width: 60, height: 4, background: 'rgba(232,227,216,0.08)' }}>
                        <div style={{ position:'absolute', left: 0, top: 0, bottom: 0, width: `${row.val*100}%`, background: row.color }} />
                      </div>
                      <span style={{ font:`10.5px/1 ${t11.mono}`, color: t11.ink, width: 32, textAlign:'right' }}>{Math.round(row.val*100)}%</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ font:`9.5px/1 ${t11.mono}`, color: t11.inkFaint, letterSpacing:'0.16em' }}>SIGNAL CLEARANCE</div>
                  <div style={{ position:'relative', height: 14, background:'rgba(232,227,216,0.06)', marginTop: 6 }}>
                    {/* tau marker */}
                    <div style={{ position:'absolute', top: -3, bottom: -3, left: `${result.tau * 100}%`, width: 1.5, background: t11.ink }} />
                    <div style={{ position:'absolute', top: 0, bottom: 0, left: 0, width: `${Math.min(1,result.bloch.magnitude) * 100}%`, background: vc.fg }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', font:`10px/1 ${t11.mono}`, color: t11.inkDim, marginTop: 3 }}>
                    <span>|r| {v11_fmt(result.bloch.magnitude,3)}</span>
                    <span>τ {v11_fmt(result.tau,3)}</span>
                  </div>
                </div>
              </div>
            </div>
          </V11Panel>

          {/* DERIVED METRICS strip */}
          <div style={{ display:'flex', background: t11.surface, border:`1px solid ${t11.line}` }}>
            <V11Stat big label="|r|"      value={v11_fmt(result.bloch.magnitude,3)} sub="Bloch magnitude" color={vc.fg} />
            <V11Stat big label="τ"        value={v11_fmt(result.tau,3)}             sub="threshold (auto)" />
            <V11Stat big label="C"        value={v11_fmt(result.aggregate_C,3)}     sub="aggregate confidence" color={v11_qualityColor(result.aggregate_C)} />
            <V11Stat big label="S(ρ)"    value={v11_fmt(result.entropy,3)}         sub="von Neumann entropy" />
            <V11Stat big label="EV"       value={v11_fmt(result.ev,2)}              sub="Sp − R" color={result.ev > 0 ? V11_VC.COMMIT.fg : V11_VC.TOXIC.fg} />
            <V11Stat big label="I"        value={v11_fmt(result.integrity,2)}       sub="Sp · St" />
            <V11Stat big label="ρ"        value={v11_fmt(result.reversibility,2)}   sub="reversibility" />
            <V11Stat big label="Δτ"       value={`${result.tau - result.tau_pure >= 0 ? '+' : ''}${v11_fmt(result.tau - result.tau_pure,3)}`} sub="from pure state" color={t11.accent} />
          </div>
        </div>

        {/* ============ RIGHT — Master + Brake + Provenance + History ============ */}
        <div style={{ display:'flex', flexDirection:'column', gap: 8, minHeight: 0, overflow:'hidden' }}>
          <V11Panel title="Master data quality" hint="global · all inputs" accent={t11.accent}>
            <MasterDial value={masterC} onChange={updateMaster}
              hasUnlocked={hasUnlocked}
              unlockedCount={unlockedCount}
              totalCount={totalCount}
              onRelock={relock} />
          </V11Panel>

          {/* BRAKE STATUS */}
          <V11Panel
            title="Safety overrides"
            hint={brakeActive ? 'ACTIVE' : 'clear'}
            accent={brakeActive ? V11_VC.TOXIC.fg : undefined}
          >
            {brakeActive ? (
              <div style={{
                background: 'rgba(255,92,108,0.10)', border:`1px solid ${V11_VC.TOXIC.fg}55`,
                padding: '8px 10px', marginBottom: 6,
              }}>
                <div style={{ font:`600 10px/1 ${t11.mono}`, color: V11_VC.TOXIC.fg, letterSpacing:'0.18em' }}>
                  {result.flags.toxic_veto && '◆ TOXIC VETO'}
                  {result.flags.emergency_override && '◆ EMERGENCY OVERRIDE'}
                  {result.flags.low_confidence_brake && '◆ LOW-CONFIDENCE BRAKE'}
                  {result.flags.one_way_brake && !result.flags.low_confidence_brake && '◆ ONE-WAY BRAKE'}
                </div>
                <div style={{ font:`italic 11.5px/1.4 ${t11.serif}`, color: t11.ink, marginTop: 4 }}>
                  {result.flags.low_confidence_brake && 'Integrity-axis inputs (Sp, St) are guesses on an irreversible decision. v11 forces ESCALATE regardless of point estimates. This closes the obvious gaming attack surface.'}
                  {!result.flags.low_confidence_brake && result.flags.one_way_brake && 'Decision is irreversible with weak integrity foundation. Human authorization required.'}
                  {result.flags.toxic_veto && 'Low integrity × high risk. No autonomous action under any circumstance.'}
                  {result.flags.emergency_override && 'High urgency on irreversible decision. Cannot WAIT for data; routing to human.'}
                </div>
              </div>
            ) : (
              <div style={{ font:`11px/1.45 ${t11.mono}`, color: t11.inkDim }}>
                No safety overrides firing. Verdict determined by |r| vs τ.
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap: 4, fontSize: 10.5, marginTop: 4 }}>
              {[
                ['Toxic veto',          result.flags.toxic_veto],
                ['Emergency override',  result.flags.emergency_override],
                ['One-Way Brake',       result.flags.one_way_brake],
                ['Low-conf brake (v11)',result.flags.low_confidence_brake],
                ['EV block',            result.flags.ev_block],
              ].map(([l, on]) => (
                <React.Fragment key={l}>
                  <span style={{ font:`10.5px/1.6 ${t11.mono}`, color: on ? V11_VC.TOXIC.fg : t11.inkFaint }}>{l}</span>
                  <span style={{ font:`10.5px/1.6 ${t11.mono}`, color: on ? V11_VC.TOXIC.fg : t11.inkGhost, textAlign:'right' }}>{on ? 'FIRED' : '—'}</span>
                </React.Fragment>
              ))}
            </div>
          </V11Panel>

          {/* PROVENANCE RECEIPT */}
          <V11Panel title="Confidence provenance" hint="audit receipt" accent={t11.accent}>
            <div style={{ display:'flex', flexDirection:'column', font:`11px/1.45 ${t11.mono}` }}>
              {[
                ['aggregate C',         v11_fmt(result.aggregate_C, 4), 'shrinkage factor', null],
                ['|r|_pure → |r|_mixed', `${v11_fmt(result.bloch_pure.magnitude, 4)} → ${v11_fmt(result.bloch.magnitude, 4)}`, `Δ ${v11_fmt(result.bloch.magnitude - result.bloch_pure.magnitude, 4)}`, null],
                ['entropy Δ from pure',  `${(result.entropy - result.entropy_pure) >= 0 ? '+' : ''}${v11_fmt(result.entropy - result.entropy_pure, 4)}`, 'S(ρ) widening', null],
                ['τ Δ from pure',        `${(result.tau - result.tau_pure) >= 0 ? '+' : ''}${v11_fmt(result.tau - result.tau_pure, 4)}`, 'threshold shift', null],
                ['verdict Δ',            result.verdict_changed ? 'YES' : 'no', 'v11 vs v10 counterfactual', result.verdict_changed ? t11.accent : null],
              ].map(([l, val, meta, flag], i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'1.2fr 1fr 1.2fr', gap: 6, alignItems:'baseline',
                  padding:'5px 0', borderTop: i ? `1px solid ${t11.line}` : 'none',
                }}>
                  <span style={{ color: t11.inkDim, fontSize: 10.5 }}>{l}</span>
                  <span style={{ color: flag || t11.ink, fontVariantNumeric:'tabular-nums' }}>{val}</span>
                  <span style={{ color: t11.inkFaint, fontSize: 10, textAlign:'right' }}>{meta}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t11.line}`, font:`italic 10.5px/1.4 ${t11.serif}`, color: t11.inkDim }}>
              Every call carries this receipt. Nielsen & Chuang Ch. 11 · Shannon 1948 · Baumgratz–Cramer–Plenio 2014.
            </div>
          </V11Panel>

          <V11Panel title="Decision history" hint="last 5 sessions">
            <div style={{ display:'flex', flexDirection:'column', font:`10.5px/1.4 ${t11.mono}` }}>
              {history.slice().reverse().map((h, i) => {
                const hc = V11_VC[h.result.decision];
                const mins = Math.round((Date.now() - h.t) / 60000);
                return (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'34px 70px 50px 28px 1fr',
                    gap: 6, alignItems:'center', padding:'3px 0',
                    borderTop: i ? `1px solid ${t11.line}` : 'none',
                  }}>
                    <span style={{ color: t11.inkFaint }}>{mins}m</span>
                    <span style={{ color: t11.ink }}>{h.label}</span>
                    <span style={{ color: t11.inkDim }}>|r|{v11_fmt(h.result.bloch.magnitude, 2)}</span>
                    <span style={{ color: v11_qualityColor(h.result.aggregate_C) }}>{Math.round(h.result.aggregate_C*100)}</span>
                    <span style={{ color: hc.fg, fontWeight: 600, fontSize: 9.5, letterSpacing:'0.12em', textAlign:'right' }}>{h.result.decision}</span>
                  </div>
                );
              })}
            </div>
          </V11Panel>
        </div>
      </div>
    </div>
  );
}

window.NervaV11Cockpit = NervaV11Cockpit;
