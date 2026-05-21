// variation-plumb.jsx — PLUMB
// Plumb's three-layer buyside audit (Optimization, Authenticity, Pricing)
// running on the NERVA decision-integrity engine underneath. 15 metric
// sliders feed layer composites, layer composites map to NERVA's 5 inputs,
// NERVA produces the verdict + forecast.

const { useState: usePlumbState, useEffect: usePlumbEffect, useMemo: usePlumbMemo } = React;

// ---------------------------------------------------------------
// PLUMB METRIC DEFINITIONS (matches the v3 scorer at plumb-audit.vercel.app)
// ---------------------------------------------------------------
const PLUMB_LAYERS = [
  {
    id: 'opt',
    name: 'Optimization',
    subtitle: 'Distribution math',
    note: 'AI platforms automate this layer natively. Necessary to score, no longer sufficient to differentiate.',
    metrics: [
      { id: 'cpm',    label: 'CPM efficiency',     source: 'Geopath · platform rate cards',     human: false },
      { id: 'reach',  label: 'Reach quality',      source: 'MRI-Simmons · Scarborough',         human: false },
      { id: 'freq',   label: 'Frequency fit',      source: 'Dwell model · format spec',         human: false },
      { id: 'targ',   label: 'Targeting precision', source: 'Audience zone data',                    human: false },
      { id: 'attr',   label: 'Attribution clarity', source: 'Measurement partner',                   human: false },
    ],
  },
  {
    id: 'auth',
    name: 'Authenticity',
    subtitle: 'Standing in the moment',
    note: 'Three of five auto-score. Cultural Truth and Moment Respect require senior buyer review by design.',
    metrics: [
      { id: 'ctx',    label: 'Context fit',        source: 'Semantic match · placement DB',     human: false },
      { id: 'dig',    label: 'Audience dignity',   source: 'Creative rubric · brand voice',     human: false },
      { id: 'cult',   label: 'Cultural truth',     source: 'Social listening · BAV',            human: true  },
      { id: 'earn',   label: 'Earned placement',   source: 'Brand history · category affinity', human: false },
      { id: 'mom',    label: 'Moment respect',     source: 'Audience state · creative register', human: true  },
    ],
  },
  {
    id: 'price',
    name: 'Pricing',
    subtitle: 'Capital math',
    note: 'The CFO question. A COMMIT at WRONG price renegotiates before IO.',
    metrics: [
      { id: 'budg',   label: 'Budget fit',         source: 'Category benchmark · brand stage',  human: false },
      { id: 'cpk',    label: 'Cost per KPI',       source: 'Named targets · flight math',       human: false },
      { id: 'scale',  label: 'Scale threshold',    source: 'Impact floor · diminishing return', human: false },
      { id: 'pay',    label: 'Payback window',     source: 'Brand cycle · flight window',       human: false },
      { id: 'rev',    label: 'Reversibility cost', source: 'Unrecoverable spend mid-flight',         human: false },
    ],
  },
];

// Plumb v3 default values (the "Sample Bank · OOH trust campaign" preset)
const PLUMB_DEFAULTS = {
  cpm: 75, reach: 82, freq: 72, targ: 78, attr: 70,
  ctx: 78, dig: 80, cult: 72, earn: 80, mom: 76,
  budg: 78, cpk: 75, scale: 80, pay: 76, rev: 80,
};

// A handful of preloaded campaign briefs
const PLUMB_BRIEFS = [
  {
    id: 'trust-q3',
    brand: 'Sample Bank',
    category: 'Financial services',
    channel: 'OOH · place-based',
    title: 'Q3 trust campaign',
    target: '8.2M viewable imp · +6pp recall · 12K branch visits · top-3 SOV',
    budget: 1200000, flight: '8 wk',
    cult: 'reviewed', mom: 'reviewed',
    values: { cpm: 75, reach: 82, freq: 72, targ: 78, attr: 70, ctx: 78, dig: 80, cult: 72, earn: 80, mom: 76, budg: 78, cpk: 75, scale: 80, pay: 76, rev: 80 },
  },
  {
    id: 'saturation-a',
    brand: 'Sample Bank',
    category: 'Financial services',
    channel: 'OOH · national',
    title: 'Variant A — saturation play',
    target: '8.2M viewable imp · +6pp recall · 12K branch visits · top-3 SOV',
    budget: 1200000, flight: '8 wk',
    cult: 'pending', mom: 'reviewed',
    values: { cpm: 88, reach: 86, freq: 78, targ: 82, attr: 76, ctx: 38, dig: 42, cult: 28, earn: 44, mom: 38, budg: 45, cpk: 38, scale: 88, pay: 32, rev: 22 },
  },
  {
    id: 'targeted-b',
    brand: 'Sample Bank',
    category: 'Financial services',
    channel: 'OOH · hub markets',
    title: 'Variant B — targeted context',
    target: '8.2M viewable imp · +6pp recall · 12K branch visits · top-3 SOV',
    budget: 580000, flight: '6 wk',
    cult: 'reviewed', mom: 'reviewed',
    values: { cpm: 72, reach: 76, freq: 78, targ: 80, attr: 72, ctx: 80, dig: 82, cult: 76, earn: 78, mom: 76, budg: 78, cpk: 76, scale: 78, pay: 78, rev: 80 },
  },
  {
    id: 'bespoke-c',
    brand: 'Sample Bank',
    category: 'Financial services',
    channel: 'OOH · single market',
    title: 'Variant C — premium bespoke',
    target: '8.2M viewable imp · +6pp recall · 12K branch visits · top-3 SOV',
    budget: 940000, flight: '4 wk',
    cult: 'reviewed', mom: 'pending',
    values: { cpm: 58, reach: 52, freq: 64, targ: 60, attr: 56, ctx: 90, dig: 92, cult: 86, earn: 88, mom: 84, budg: 38, cpk: 42, scale: 28, pay: 48, rev: 36 },
  },
  {
    id: 'search-q2',
    brand: 'Auto dealer group',
    category: 'Auto',
    channel: 'Search',
    title: 'Q2 acquisition push',
    target: '$48 CPA · 4.2K leads · 14% conv',
    budget: 180000, flight: '12 wk',
    cult: 'pending', mom: 'reviewed',
    values: { cpm: 78, reach: 70, freq: 74, targ: 80, attr: 76, ctx: 62, dig: 54, cult: 48, earn: 52, mom: 60, budg: 64, cpk: 62, scale: 62, pay: 60, rev: 64 },
  },
];

// -----------------------------------------------------------------
// PLUMB → NERVA INPUT MAPPING
// -----------------------------------------------------------------
function plumbToNerva(scores, flightPressure = 0.5) {
  const m = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length / 100;
  const opt = m([scores.cpm, scores.reach, scores.freq, scores.targ, scores.attr]);
  const auth = m([scores.ctx, scores.dig, scores.cult, scores.earn, scores.mom]);
  const pricing_stability = m([scores.budg, scores.scale, scores.pay]);
  const pricing_risk = (200 - scores.cpk - scores.rev) / 200; // inverted: high cost/low reversibility = high risk
  return {
    E:  flightPressure,
    S:  auth,                  // strategic plan quality ≡ authenticity
    R:  1 - pricing_risk,      // R is risk: lower pricing health → higher risk
    Sp: opt,                   // support / evidence ≡ optimization data
    St: pricing_stability,     // stability ≡ pricing fundamentals
    composites: { opt: opt * 100, auth: auth * 100, pricing: ((pricing_stability * 100 * 3) + scores.cpk + scores.rev) / 5 },
  };
}

// -----------------------------------------------------------------
// PLUMB VERDICT MAPPING (Plumb uses CONSULT instead of ESCALATE)
// -----------------------------------------------------------------
const PLUMB_VERDICT = {
  COMMIT:   { label: 'COMMIT',   action: 'Approve',     color: '#1f6b3f' },
  HOLD:     { label: 'HOLD',     action: 'Tighten',     color: '#8a6a1a' },
  WAIT:     { label: 'WAIT',     action: 'Renegotiate', color: '#3a5285' },
  ESCALATE: { label: 'CONSULT',  action: 'Escalate',    color: '#9a5a14' },
  TOXIC:    { label: 'TOXIC',    action: 'Reject',      color: '#a3361b' },
};

const PRICING_SUB = (composite) => {
  if (composite >= 72) return { label: 'FAIR',      tint: '#1f6b3f' };
  if (composite >= 55) return { label: 'STRETCHED', tint: '#8a6a1a' };
  return                     { label: 'WRONG',     tint: '#a3361b' };
};

// -----------------------------------------------------------------
// VISUAL TOKENS
// -----------------------------------------------------------------
const px = {
  bg: '#f6f2ea',
  paper: '#fbf8f0',
  ink: '#15110b',
  inkDim: 'rgba(21,17,11,0.62)',
  inkFaint: 'rgba(21,17,11,0.38)',
  rule: 'rgba(21,17,11,0.14)',
  ruleHi: 'rgba(21,17,11,0.32)',
  accent: '#a3361b',
  green: '#1f6b3f',
  amber: '#8a6a1a',
  blue: '#3a5285',
  serif: '"Newsreader", "Iowan Old Style", Georgia, serif',
  sans: '"IBM Plex Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

// -----------------------------------------------------------------
// MICRO COMPONENTS
// -----------------------------------------------------------------
function PlumbSlider({ value, onChange, color = px.ink }) {
  return (
    <input type="range" min="0" max="100" step="1" value={value}
      onChange={e => onChange(parseInt(e.target.value, 10))}
      style={{ width: '100%', accentColor: color, height: 4 }} />
  );
}

function MetricRow({ metric, value, onChange, humanReviewed }) {
  const color = value >= 70 ? px.green : value >= 55 ? px.amber : px.accent;
  return (
    <div style={{ padding:'8px 0', borderBottom: `1px solid ${px.rule}` }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: `500 13.5px/1.2 ${px.serif}`, color: px.ink, display:'flex', alignItems:'center', gap: 6 }}>
            {metric.label}
            {metric.human && (
              <span style={{
                font:`600 9px/1 ${px.mono}`, letterSpacing:'0.1em',
                padding:'2px 4px', borderRadius: 2,
                background: humanReviewed === 'reviewed' ? 'rgba(31,107,63,0.12)' : 'rgba(163,54,27,0.12)',
                color: humanReviewed === 'reviewed' ? px.green : px.accent,
                border: `1px solid ${humanReviewed === 'reviewed' ? 'rgba(31,107,63,0.4)' : 'rgba(163,54,27,0.4)'}`,
              }}>
                {humanReviewed === 'reviewed' ? 'REVIEWED' : 'NEEDS REVIEW'}
              </span>
            )}
          </div>
          <div style={{ font:`11.5px/1.3 ${px.sans}`, color: px.inkDim, marginTop: 1 }}>{metric.source}</div>
        </div>
        <div style={{ font:`400 22px/1 ${px.mono}`, color, fontVariantNumeric: 'tabular-nums', flex:'0 0 auto' }}>{value}</div>
      </div>
      <div style={{ marginTop: 6 }}>
        <PlumbSlider value={value} onChange={onChange} color={color} />
      </div>
    </div>
  );
}

function GateBadge({ score, layer }) {
  let label, color, bg;
  if (score >= 70)      { label = 'CLEARS';  color = px.green; bg = 'rgba(31,107,63,0.10)'; }
  else if (score >= 55) { label = 'SOFT';    color = px.amber; bg = 'rgba(138,106,26,0.10)'; }
  else                  { label = 'FAILS';   color = px.accent; bg = 'rgba(163,54,27,0.10)'; }
  return (
    <span style={{
      font:`600 10.5px/1 ${px.mono}`, letterSpacing:'0.16em',
      padding:'4px 8px', background: bg, color, border: `1px solid ${color}55`,
    }}>{label}</span>
  );
}

// Layer card
function LayerCard({ layer, scores, setScore, humanState, setHumanState, composite }) {
  return (
    <div style={{
      background: px.paper, border: `1px solid ${px.ruleHi}`,
      display:'flex', flexDirection:'column', minHeight: 0, padding: '14px 16px',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ font:`10px/1 ${px.mono}`, color: px.inkFaint, letterSpacing:'0.2em' }}>LAYER · {layer.id.toUpperCase()}</div>
          <h2 style={{ margin: '4px 0 0', font:`500 22px/1.05 ${px.serif}`, color: px.ink, letterSpacing:'-0.01em' }}>{layer.name}.</h2>
          <div style={{ font:`italic 12.5px/1.3 ${px.serif}`, color: px.inkDim, marginTop: 2 }}>{layer.subtitle}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ font:`200 38px/0.9 ${px.serif}`, color: px.ink, letterSpacing:'-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(composite)}
          </div>
          <div style={{ marginTop: 4 }}>
            <GateBadge score={composite} layer={layer.id} />
          </div>
        </div>
      </div>
      <div style={{ font:`11px/1.4 ${px.sans}`, color: px.inkDim, marginBottom: 8 }}>{layer.note}</div>
      <div style={{ flex:1, minHeight: 0, overflowY: 'auto' }}>
        {layer.metrics.map(m => (
          <MetricRow key={m.id} metric={m} value={scores[m.id]} humanReviewed={humanState[m.id]}
            onChange={v => setScore(m.id, v)} />
        ))}
      </div>
    </div>
  );
}

// Simple forecast cone for Plumb (lighter style than terminal)
function PlumbForecastChart({ history, current, forecast }) {
  const W = 280, H = 88;
  const M = { l: 6, r: 6, t: 10, b: 14 };
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const nowX = 0.4;
  const histPts = history.map((h, i) => ({ x: (i / Math.max(1, history.length)) * nowX, r: h.r }));
  const fcPts = [{ x: nowX, r: current.r, sigma: 0 }];
  forecast.points.forEach(p => fcPts.push({ x: nowX + (p.minutes / 60) * (1 - nowX), r: p.r, sigma: p.sigma }));
  const xp = v => M.l + v * pw, yp = v => M.t + (1 - v) * ph;
  const tauY = yp(current.tau);
  const bandTop = fcPts.map(p => `${xp(p.x)},${yp(Math.min(1, p.r + p.sigma))}`).join(' ');
  const bandBot = fcPts.map(p => `${xp(p.x)},${yp(Math.max(0, p.r - p.sigma))}`).reverse().join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width:'100%', height: H, display:'block' }}>
      <line x1={M.l} y1={tauY} x2={M.l + pw} y2={tauY} stroke={px.ink} strokeDasharray="3 3" opacity="0.4" />
      <text x={M.l + pw - 2} y={tauY - 3} textAnchor="end" style={{ font:`9.5px ${px.mono}`, fill: px.inkDim }}>τ {fmt(current.tau,2)}</text>
      <line x1={xp(nowX)} y1={M.t} x2={xp(nowX)} y2={M.t + ph} stroke={px.ink} strokeDasharray="1 2" opacity="0.35" />
      <text x={xp(nowX)} y={M.t - 2} textAnchor="middle" style={{ font:`9.5px ${px.mono}`, fill: px.ink }}>NOW</text>
      <polygon points={`${bandTop} ${bandBot}`} fill={px.ink} opacity="0.10" />
      <polyline points={histPts.map(p => `${xp(p.x)},${yp(p.r)}`).join(' ')} fill="none" stroke={px.ink} strokeWidth="1.4" opacity="0.7" />
      {histPts.map((p, i) => <circle key={i} cx={xp(p.x)} cy={yp(p.r)} r="1.6" fill={px.ink} opacity="0.6" />)}
      <polyline points={fcPts.map(p => `${xp(p.x)},${yp(p.r)}`).join(' ')} fill="none" stroke={px.ink} strokeWidth="1.6" strokeDasharray="3 2" />
      <circle cx={xp(nowX)} cy={yp(current.r)} r="3" fill={px.ink} />
      {forecast.points.map((p, i) => {
        const x = xp(nowX + (p.minutes / 60) * (1 - nowX));
        return (
          <g key={i}>
            <line x1={x} y1={M.t + ph} x2={x} y2={M.t + ph + 2} stroke={px.inkDim} />
            <text x={x} y={M.t + ph + 11} textAnchor="middle" style={{ font:`9.5px ${px.mono}`, fill: px.inkDim }}>{p.label.replace('T+', '')}</text>
          </g>
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------------------
// MAIN VIEW
// -----------------------------------------------------------------
function PlumbView() {
  const { state, update, metrics, forecast, history, api } = useNerva();
  const [scores, setScores] = usePlumbState(PLUMB_DEFAULTS);
  const [humanState, setHumanState] = usePlumbState({ cult: 'reviewed', mom: 'reviewed' });
  const [brief, setBrief] = usePlumbState(PLUMB_BRIEFS[0]);
  const [flightPressure, setFlightPressure] = usePlumbState(0.5);
  const [oneWayDoor, setOneWayDoor] = usePlumbState('First measurable recall signal at week 2');

  // Push derived NERVA inputs whenever scores change
  const mapped = usePlumbMemo(() => plumbToNerva(scores, flightPressure), [scores, flightPressure]);

  usePlumbEffect(() => {
    update({ E: mapped.E, S: mapped.S, R: mapped.R, Sp: mapped.Sp, St: mapped.St });
  }, [mapped.E, mapped.S, mapped.R, mapped.Sp, mapped.St]);

  const composites = mapped.composites;
  const overall = Math.round((composites.opt + composites.auth + composites.pricing) / 3);

  // Plumb's verdict semantics: NERVA verdict, but renamed CONSULT
  const verdict = metrics.verdict;
  // If a human-review metric is below 70 and not reviewed, force CONSULT
  const humanGate = (humanState.cult === 'pending' && scores.cult < 70) || (humanState.mom === 'pending' && scores.mom < 70);
  const finalVerdict = humanGate && verdict === 'COMMIT' ? 'ESCALATE' : verdict;
  const v = PLUMB_VERDICT[finalVerdict];

  // Pricing sub-verdict (Plumb's "FAIR/STRETCHED/WRONG")
  const pricingSub = PRICING_SUB(composites.pricing);

  // Setter that snapshots brief + values together
  const applyBrief = (b) => {
    setBrief(b);
    setScores(b.values);
    setHumanState({ cult: b.cult, mom: b.mom });
  };
  const setScore = (id, v) => setScores(s => ({ ...s, [id]: v }));

  // The "Plumb thesis" line — TOXIC explanation
  const isToxicShape = composites.opt >= 65 && composites.auth < 50;

  return (
    <div style={{
      width:'100%', height: '100%', background: px.bg, color: px.ink,
      fontFamily: px.sans, overflow: 'hidden auto', display:'flex', flexDirection:'column',
    }}>
      {/* HEADER */}
      <header style={{
        padding: '14px 28px 12px', display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'end', gap: 18,
        borderBottom: `1px solid ${px.ink}`, background: px.paper,
      }}>
        <div>
          <div style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.22em' }}>AC ADS · PLUMB · v3 · 2026</div>
          <h1 style={{ margin: '4px 0 0', font:`500 38px/0.95 ${px.serif}`, color: px.ink, letterSpacing:'-0.02em' }}>Plumb.</h1>
          <div style={{ font:`italic 14px/1.3 ${px.serif}`, color: px.inkDim, marginTop: 2 }}>The three-layer buyside audit.</div>
        </div>
        <div style={{ textAlign:'center', borderLeft:`1px solid ${px.rule}`, borderRight:`1px solid ${px.rule}`, padding: '0 22px' }}>
          <div style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.18em' }}>SCORING ENGINE</div>
          <div style={{ font:`500 16px/1 ${px.serif}`, marginTop: 4 }}>
            running on <span style={{ font:`600 14px ${px.mono}`, letterSpacing:'0.18em', color: px.ink }}>NERVA v10</span>
          </div>
          <div style={{ font:`italic 11.5px/1.3 ${px.serif}`, color: px.inkDim, marginTop: 4 }}>
            decision integrity engine · {api.region} · {Math.round(api.latency)}ms
          </div>
        </div>
        <div style={{ textAlign:'right', font:`11px/1.45 ${px.mono}`, color: px.inkDim }}>
          <div style={{ color: px.ink, font:`500 12px ${px.mono}`, letterSpacing:'0.08em' }}>AUDIT 28491 · LIVE</div>
          <div>operator: cmdr.chen</div>
          <div>session 7F-2A91 · 14:08:21</div>
          <div style={{ color: px.green, marginTop: 1 }}>● api nominal {api.uptime}%</div>
        </div>
      </header>

      {/* BRIEF BAR */}
      <div style={{
        padding: '10px 28px', borderBottom: `1px solid ${px.rule}`, background: px.bg,
        display:'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems:'center',
      }}>
        <div>
          <div style={{ font:`9.5px ${px.mono}`, color: px.inkDim, letterSpacing:'0.18em', marginBottom: 2 }}>BRIEF</div>
          <div style={{ font:`500 15px/1.1 ${px.serif}`, color: px.ink }}>
            {brief.brand} <span style={{ color: px.inkDim }}>·</span> {brief.title}
          </div>
          <div style={{ font:`italic 12px ${px.serif}`, color: px.inkDim }}>
            {brief.category} · {brief.channel} · ${(brief.budget/1000).toFixed(0)}K · {brief.flight}
          </div>
        </div>
        <div style={{ font:`12px/1.4 ${px.serif}`, color: px.inkDim, paddingLeft: 16, borderLeft:`1px solid ${px.rule}` }}>
          <span style={{ color: px.ink }}>Measured against ·</span> {brief.target}
        </div>
        <div style={{ display:'flex', gap: 6, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {PLUMB_BRIEFS.map(b => (
            <button key={b.id} onClick={() => applyBrief(b)} style={{
              background: brief.id === b.id ? px.ink : 'transparent',
              color: brief.id === b.id ? px.paper : px.ink,
              border: `1px solid ${px.ink}`,
              font:`600 10px/1 ${px.mono}`, letterSpacing:'0.06em',
              padding:'5px 8px', cursor:'pointer',
            }}>{b.title.split('—')[0].trim() || b.title}</button>
          ))}
        </div>
      </div>

      {/* MAIN: 3 LAYER CARDS + VERDICT COLUMN */}
      <div style={{
        flex: 1, minHeight: 0, display:'grid',
        gridTemplateColumns: '1fr 1fr 1fr 380px', gap: 12, padding: '14px 22px 0',
      }}>
        <LayerCard layer={PLUMB_LAYERS[0]} scores={scores} setScore={setScore}
          humanState={humanState} setHumanState={setHumanState} composite={composites.opt} />
        <LayerCard layer={PLUMB_LAYERS[1]} scores={scores} setScore={setScore}
          humanState={humanState} setHumanState={setHumanState} composite={composites.auth} />
        <LayerCard layer={PLUMB_LAYERS[2]} scores={scores} setScore={setScore}
          humanState={humanState} setHumanState={setHumanState} composite={composites.pricing} />

        {/* VERDICT COLUMN */}
        <aside style={{ display:'flex', flexDirection:'column', gap: 12, minHeight: 0 }}>
          {/* Verdict callout */}
          <div style={{
            background: px.paper, border: `2px solid ${v.color}`,
            padding: '14px 18px',
          }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
              <span style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.2em' }}>VERDICT</span>
              <span style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.12em' }}>composite {overall}</span>
            </div>
            <div style={{ font:`500 56px/0.95 ${px.serif}`, color: v.color, letterSpacing:'-0.03em', marginTop: 2 }}>
              {v.label.charAt(0) + v.label.slice(1).toLowerCase()}
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ font:`italic 14px ${px.serif}`, color: v.color }}>{v.action}.</span>
              <span style={{ font:`italic 13px ${px.serif}`, color: px.inkDim }}>
                pricing <span style={{ color: pricingSub.tint }}>{pricingSub.label.toLowerCase()}</span>
              </span>
            </div>
            <div style={{ font:`13px/1.5 ${px.serif}`, color: px.ink, marginTop: 10 }}>
              {finalVerdict === 'COMMIT' && 'All three layers earn the buy. Distribution math clears the floor, authenticity earns the moment, pricing is sound against the named outcomes.'}
              {finalVerdict === 'HOLD' && 'One layer is soft but not disqualifying. Tighten the inputs and re-score before approving spend.'}
              {finalVerdict === 'WAIT' && 'Pricing fails or both quality layers are below threshold. Not a media question yet — return to strategy or renegotiate the rate.'}
              {finalVerdict === 'ESCALATE' && 'One layer requires judgment the model cannot supply. Escalate to named senior strategist; override reasoning logs to audit field.'}
              {finalVerdict === 'TOXIC' && (isToxicShape
                ? 'High optimization, low authenticity. The buy scores well on metrics the agency charges against — and poorly on the layer they have no incentive to measure. The verdict no compensation model produces on its own.'
                : 'Hard veto. Reversibility too low against current foundation. Do not proceed.')}
            </div>
          </div>

          {/* Three-gate visualization */}
          <div style={{ background: px.paper, border: `1px solid ${px.ruleHi}`, padding: '12px 16px' }}>
            <div style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.2em', marginBottom: 8 }}>COMPOUND GATE</div>
            {[
              ['Optimization', composites.opt, 70],
              ['Authenticity', composites.auth, 70],
              ['Pricing',      composites.pricing, 70],
            ].map(([l, c, t]) => {
              const color = c >= 70 ? px.green : c >= 55 ? px.amber : px.accent;
              return (
                <div key={l} style={{ display:'grid', gridTemplateColumns:'90px 1fr 38px', alignItems:'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ font:`13px/1 ${px.serif}`, color: px.ink }}>{l}</span>
                  <div style={{ position:'relative', height: 8, background:'rgba(21,17,11,0.06)' }}>
                    <div style={{ position:'absolute', left: 0, top: 0, bottom: 0, width: `${c}%`, background: color }} />
                    <div style={{ position:'absolute', left: `${t}%`, top: -3, bottom: -3, width: 1.5, background: px.ink }} />
                  </div>
                  <span style={{ font:`12px/1 ${px.mono}`, color, textAlign:'right' }}>{Math.round(c)}</span>
                </div>
              );
            })}
            <div style={{ font:`italic 11px/1.4 ${px.serif}`, color: px.inkDim, marginTop: 6, paddingTop: 6, borderTop:`1px solid ${px.rule}` }}>
              All three gates clear independently for COMMIT. A strong Optimization score does not override a failed Authenticity score.
            </div>
          </div>

          {/* Forecast at flight close */}
          <div style={{ background: px.paper, border: `1px solid ${px.ruleHi}`, padding: '12px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 6 }}>
              <span style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.2em' }}>FORECAST AT FLIGHT CLOSE</span>
              <span style={{ font:`9.5px ${px.mono}`, color: px.inkFaint, letterSpacing:'0.1em' }}>damped-trend · n={history.length+1}</span>
            </div>
            <PlumbForecastChart history={history} current={metrics} forecast={forecast} />
            <div style={{ marginTop: 4, fontSize: 11.5, font:`11.5px/1.4 ${px.serif}`, color: px.inkDim }}>
              {forecast.window}.
              {' '}
              <span style={{ color: px.inkDim }}>P(≥τ) at flight close: <strong style={{ color: px.ink }}>{Math.round(forecast.points[forecast.points.length-1].pAbove * 100)}%</strong></span>
            </div>
          </div>

          {/* One-way door + KPIs */}
          {finalVerdict === 'COMMIT' && (
            <div style={{ background: px.paper, border: `1px solid ${px.ruleHi}`, padding: '12px 16px' }}>
              <div style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.2em', marginBottom: 6 }}>ONE-WAY DOOR CRITERION</div>
              <input value={oneWayDoor} onChange={e => setOneWayDoor(e.target.value)}
                style={{ width: '100%', font:`13px/1.4 ${px.serif}`, padding:'4px 6px', background:'transparent', border:`1px solid ${px.rule}`, color: px.ink, outline:'none' }} />
              <div style={{ font:`italic 11px/1.4 ${px.serif}`, color: px.inkDim, marginTop: 6 }}>
                Stamps to the IO. Falsified at flight close against the named KPI target set.
              </div>
            </div>
          )}
          {finalVerdict === 'ESCALATE' && (
            <div style={{ background: px.paper, border: `1px solid ${px.ruleHi}`, padding: '12px 16px' }}>
              <div style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.2em', marginBottom: 6 }}>ESCALATION QUEUE</div>
              <div style={{ font:`13px/1.5 ${px.serif}`, color: px.ink }}>
                Route to <strong>Senior strategist</strong> · channel SME.
              </div>
              <div style={{ font:`italic 11px/1.4 ${px.serif}`, color: px.inkDim, marginTop: 4 }}>
                Documented escalations hit at 78%. Undocumented at 33%. Override reasoning stamps to audit field.
              </div>
              <button style={{
                marginTop: 8, width: '100%', background: px.ink, color: px.paper,
                border: 'none', font:`600 11px/1 ${px.mono}`, letterSpacing:'0.16em',
                padding:'8px 0', cursor:'pointer',
              }}>SEND TO REVIEW · SARAH K</button>
            </div>
          )}
        </aside>
      </div>

      {/* FOOTER — flight pressure + audit trail */}
      <div style={{
        marginTop: 14, padding: '12px 28px 16px', borderTop: `1px solid ${px.rule}`,
        display:'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, background: px.paper,
      }}>
        <div>
          <div style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.2em', marginBottom: 4 }}>NERVA DERIVED INPUTS</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 6, font:`12px ${px.mono}`, color: px.ink }}>
            {[
              ['E', mapped.E, 'flight pressure'],
              ['S', mapped.S, 'authenticity'],
              ['R', mapped.R, 'price risk'],
              ['Sp', mapped.Sp, 'optimization'],
              ['St', mapped.St, 'pricing health'],
            ].map(([k, v, sub]) => (
              <div key={k}>
                <div style={{ color: px.accent }}>{k}</div>
                <div>{fmt(v, 2)}</div>
                <div style={{ font:`italic 10px ${px.serif}`, color: px.inkFaint }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.2em', marginBottom: 4 }}>FLIGHT PRESSURE · E</div>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <input type="range" min="0" max="1" step="0.01" value={flightPressure}
              onChange={e => setFlightPressure(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: px.accent }} />
            <span style={{ font:`14px ${px.mono}`, color: px.ink, width: 40 }}>{fmt(flightPressure, 2)}</span>
          </div>
          <div style={{ font:`italic 11px/1.4 ${px.serif}`, color: px.inkDim, marginTop: 4 }}>
            Time-to-IO pressure. Higher values raise NERVA's adaptive threshold τ — strong signals still clear, marginal ones won't.
          </div>
        </div>
        <div>
          <div style={{ font:`10px ${px.mono}`, color: px.inkDim, letterSpacing:'0.2em', marginBottom: 4 }}>NERVA SIGNAL</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 12, font:`12px ${px.mono}` }}>
            <div><div style={{ color: px.inkDim }}>|r|</div><div style={{ font:`400 18px ${px.mono}`, color: v.color }}>{fmt(metrics.r, 3)}</div></div>
            <div><div style={{ color: px.inkDim }}>τ</div><div style={{ font:`400 18px ${px.mono}` }}>{fmt(metrics.tau, 3)}</div></div>
            <div><div style={{ color: px.inkDim }}>EV</div><div style={{ font:`400 18px ${px.mono}`, color: metrics.EV > 0 ? px.green : px.accent }}>{fmt(metrics.EV, 2)}</div></div>
            <div><div style={{ color: px.inkDim }}>ρ</div><div style={{ font:`400 18px ${px.mono}` }}>{fmt(metrics.reversibility, 2)}</div></div>
          </div>
          <div style={{ font:`italic 11px/1.4 ${px.serif}`, color: px.inkDim, marginTop: 4 }}>
            Plumb's verdict gates and NERVA's signal both clear on the same evidence. The receipt is the same number, in two languages.
          </div>
        </div>
      </div>
    </div>
  );
}

window.PlumbView = PlumbView;
