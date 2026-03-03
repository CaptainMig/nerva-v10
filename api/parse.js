export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { scenario } = req.body;
  if (!scenario) return res.status(400).json({ error: 'No scenario provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: `You are a decision analysis parameter extractor for NERVA, a decision integrity engine.
Extract exactly 5 parameters from the scenario description. Return ONLY valid JSON, no other text.

Parameters:
- E (Urgency 0-1): How time-critical or pressing is this decision?
- S (Strategy 0-1): How well-formed is the plan or approach?
- R (Risk 0-1): What is the exposure to negative outcomes?
- support (0-1): How strong is the evidence or backing for this decision?
- stability (0-1): How stable is the environment or context?

Return format: {"E": 0.00, "S": 0.00, "R": 0.00, "support": 0.00, "stability": 0.00}`,
        messages: [{ role: 'user', content: scenario }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Anthropic error: ${err}` });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    // Strip any markdown fences just in case
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // Validate all 5 keys present and in range
    const keys = ['E', 'S', 'R', 'support', 'stability'];
    for (const k of keys) {
      if (typeof parsed[k] !== 'number') throw new Error(`Missing key: ${k}`);
      parsed[k] = Math.max(0, Math.min(1, parsed[k]));
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
