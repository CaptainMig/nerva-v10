// api/parse.js — Vercel serverless function for NERVA v10 AI scenario parser
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { scenario } = req.body || {};
  if (!scenario) return res.status(400).json({ error: 'No scenario provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `You are NERVA's scenario parser. Extract 5 numeric parameters (0.0–1.0) from this scenario. Reply with ONLY valid JSON, no markdown, no explanation.

Scenario: "${scenario}"

Parameters:
- E (urgency/emotional pressure): how time-critical? 0=none, 1=maximum
- S (strategy quality): how well-planned? 0=no plan, 1=excellent
- R (risk exposure): how severe is downside? 0=none, 1=catastrophic/irreversible
- Sp (support/evidence): how strong is data confidence? 0=none, 1=certain
- St (stability): how stable is environment? 0=chaotic, 1=very stable

Calibration rules:
- Medical emergencies/arterial bleeds/life-threat: E=0.90-0.95, R=0.85-0.95, St=0.15-0.35
- Lethal/weapons/surgery: R >= 0.70 minimum
- HFT/trading: E=0.75-0.90, S=0.80-0.95
- AV/autonomous vehicles normal ops: R=0.20-0.45, St=0.65-0.85
- Comms degraded/personnel unavailable: St=0.15-0.40
- AI-owned/automated process: Sp=0.45-0.65
- 24h commitment window: R >= 0.55 (irreversibility)

Reply format (JSON only): {"E":0.00,"S":0.00,"R":0.00,"Sp":0.00,"St":0.00}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const clamp = (v) => Math.max(0, Math.min(1, parseFloat(v) || 0));
    return res.status(200).json({
      E:  clamp(parsed.E),
      S:  clamp(parsed.S),
      R:  clamp(parsed.R),
      Sp: clamp(parsed.Sp),
      St: clamp(parsed.St),
    });
  } catch (err) {
    console.error('Parse error:', err);
    return res.status(500).json({ error: 'Parse failed', detail: err.message });
  }
}
