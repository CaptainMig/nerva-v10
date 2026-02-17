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

    const systemPrompt = `You are the NERVA 6D Extractor. Your job is to read a natural-language scenario and extract six numerical parameters (each 0.00 to 1.00).

The six parameters:
- urgency: How time-sensitive or emotionally charged is this? 0 = no rush, 1 = act now or lives lost
- strategy: How clear and well-formed is the plan? 0 = no plan/improvising, 1 = detailed protocol in place
- risk: How much exposure to negative outcomes? 0 = no downside, 1 = catastrophic/lethal consequences
- support: How strong is the evidence/data? 0 = guessing/no data, 1 = confirmed by multiple reliable sources
- stability: How stable are conditions? 0 = everything falling apart, 1 = calm and predictable

Also infer these secondary signals (each 0.00 to 1.00):
- irreversibility: Can this be undone? 0 = fully reversible, 1 = permanent/lethal
- stakes: How much is on the line? 0 = trivial, 1 = existential
- time_pressure: How much does delay cost? 0 = can wait forever,
};
