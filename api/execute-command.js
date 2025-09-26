import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end(); // Only POST

  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command missing" });

  try {
    const prompt = `
      You are an image editor assistant.
      Convert user command into JSON with following structure:
      {
        "action": "draw_circle" | "adjust_brightness",
        "color": "<color>",
        "x": <number>,
        "y": <number>,
        "radius": <number>,
        "percent": <number>
      }
      Command: "${command}"
      Only return valid JSON.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    const message = completion.choices[0].message.content.trim();
    const actionJSON = JSON.parse(message);

    res.status(200).json(actionJSON);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI command execution failed" });
  }
}
