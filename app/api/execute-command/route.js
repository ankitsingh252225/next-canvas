import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { command } = await req.json();
    if (!command) return new Response(JSON.stringify({ error: "Command missing" }), { status: 400 });

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

    return new Response(JSON.stringify(actionJSON), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "AI command execution failed", details: error.message }), { status: 500 });
  }
}
