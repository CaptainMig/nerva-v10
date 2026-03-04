// /api/parse.js — NERVA v8.3.2 Scenario Parser
// Improved prompt for better urgency/risk detection in medical/lethal scenarios

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scenario } = req.body;
  if (!scenario || typeof scenario !== 'string') {
    return res.status(400).json({ error: 'Missing scenario' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are a NERVA decision parameter extractor. Given a scenario, output ONLY a JSON object with 5 parameters (0.0 to 1.0).

PARAMETERS:
- E (urgency): Time pressure. 0 = no rush, 1 = seconds matter
  CRITICAL: Medical emergencies (bleeding, cardiac, respiratory), active combat, imminent collision = 0.85-0.95
  Life-threatening situations are ALWAYS high urgency even if not explicitly stated

- S (strategy): Plan quality. 0 = no plan, 1 = well-defined protocol
  If a standard protocol exists (surgical procedure, ROE), start at 0.6+
  If improvising or deviating from plan, lower to 0.3-0.5

- R (risk): Downside exposure. 0 = harmless, 1 = lethal/catastrophic
  Death, permanent injury, civilian casualties, financial ruin = 0.85-0.95
  Any action involving weapons, surgery, or life support = 0.7+ minimum

- support (data confidence): Evidence quality. 0 = guessing, 1 = verified intel
  Sensors working + confirmed visual = 0.7+
  Single source, degraded sensors, conflicting reports = 0.3-0.5
  "Uncertain", "limited intel", "unclear" = 0.2-0.4

- stability (system/environment): 0 = degraded/chaotic, 1 = nominal
  Equipment malfunction, bad weather, comms down, key personnel unavailable = 0.15-0.35
  Normal operating conditions = 0.7+

CALIBRATION EXAMPLES:
"Drone strike, uncertain intel, civilians nearby" → E:0.7, S:0.5, R:0.95, support:0.35, stability:0.6
"Arterial bleed, surgeon unavailable" → E:0.95, S:0.6, R:0.9, support:0.5, stability:0.15
"Quarterly report deadline tomorrow" → E:0.6, S:0.7, R:0.3, support:0.8, stability:0.85

Scenario: "${scenario.replace(/"/g, '\\"')}"

Respond with ONLY valid JSON, no explanation:
{"E": 0.XX, "S": 0.XX, "R": 0.XX, "support": 0.XX, "stability": 0.XX}`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response' });
    }

    const params = JSON.parse(jsonMatch[0]);
    
    // Validate all parameters exist and are in range
    const keys = ['E', 'S', 'R', 'support', 'stability'];
    for (const k of keys) {
      if (typeof params[k] !== 'number' || params[k] < 0 || params[k] > 1) {
        return res.status(500).json({ error: `Invalid parameter: ${k}` });
      }
      // Round to 2 decimal places
      params[k] = Math.round(params[k] * 100) / 100;
    }

    return res.status(200).json(params);

  } catch (err) {
    console.error('Parse error:', err);
    return res.status(500).json({ error: 'Parse failed' });
  }
}
