module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    const { scenario } = req.body || {};
    if (!scenario || !scenario.trim())
      return res.status(400).json({ error: "Missing scenario" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const systemPrompt = "You are the NERVA 6D Extractor. Read a scenario and extract six parameters (each 0.00 to 1.00). The six parameters: urgency (0=no rush, 1=act now or lives lost), strategy (0=no plan, 1=detailed protocol), risk (0=no downside, 1=catastrophic/lethal), support (0=guessing, 1=confirmed by multiple sources), stability (0=everything failing, 1=calm and predictable). Also infer: irreversibility (0=fully reversible, 1=permanent/lethal), stakes (0=trivial, 1=existential), time_pressure (0=can wait, 1=seconds matter). Rules: be conservative, default 0.50 if ambiguous, never hallucinate. Include a reasoning string (1-2 sentences). Respond with ONLY valid JSON, no markdown, no backticks.";

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: scenario.trim() }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({ error: "openai_error", status: resp.status, details: errText });
    }

    const data = await resp.json();
    const text = data.choices[0].message.content.trim();
    const clean = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: "extract_failed", details: String(e) });
  }
};
