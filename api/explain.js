module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "POST only" });

    const { scenario, inputs, nerva } = req.body || {};
    if (!inputs || !nerva)
      return res.status(400).json({ error: "Missing inputs or nerva output" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const systemPrompt = "You are the NERVA Explainer. Explain a decision in 2-4 sentences. NEVER use math words (entropy, coherence, phase, Bloch, vector, quantum, eigenvalue, density matrix, radius, theta, phi, expected value, purity, norm). Only use: urgency, plan quality, risk, evidence, stability, reversibility (one-way door vs two-way door), and the outcome (COMMIT, WAIT, TOXIC ESCALATION). End with 1-2 things that would change the outcome. Write like briefing a commander. Return ONLY plain text.";

    var userMessage = "Scenario: " + (scenario || "(none)");
    userMessage += "\nInputs: urgency=" + inputs.emotion + ", strategy=" + inputs.strategy;
    userMessage += ", risk=" + inputs.risk + ", evidence=" + inputs.support;
    userMessage += ", stability=" + inputs.stability;
    userMessage += "\nDecision: " + nerva.decision;
    userMessage += "\nQuadrant: " + nerva.quadrant;
    userMessage += "\nThreshold: " + nerva.threshold_used + " (mode: " + nerva.threshold_mode + ")";
    userMessage += "\nExplain in 2-4 sentences. No math words. End with what would change it.";

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({ error: "openai_error", status: resp.status, details: errText });
    }

    const data = await resp.json();
    const text = data.choices[0].message.content.trim();

    return res.status(200).json({ explanation: text });
  } catch (e) {
    return res.status(500).json({ error: "explain_failed", details: String(e) });
  }
};
