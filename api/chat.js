const Anthropic = require("@anthropic-ai/sdk");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages, tripContext } = req.body;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are a warm, enthusiastic personal trip planning assistant. You are helping plan an exciting trip.

Current trip context:
${tripContext || "No trip data loaded yet."}

You can help with:
- Suggesting activities, restaurants, and hidden gems for the destination
- Answering "what if" questions about swapping days or changing plans
- Estimating costs and adjusting budget breakdowns
- Recommending packing items for the destination and season
- Flagging scheduling conflicts or things to book in advance
- Giving honest opinions when asked to compare options

Keep responses concise and actionable. Use bullet points for lists. Be encouraging and fun - this is a special trip! When suggesting changes, be specific (e.g. "On Day 3, you could swap the museum for X because..."). Never use em dashes. Use plain hyphens instead.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    res.status(200).json({ reply: response.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
