import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const { command } = await req.json();
    if (!command) return new Response(JSON.stringify({ error: "Command missing" }), { status: 400 });

    const prompt = `
      You are a canvas image editor assistant.
      Convert the user's command into valid JSON with the following structure:

      {
        "action": "draw_circle" | "adjust_brightness",
        "color": "<color>",       // for draw_circle
        "x": <number>,            // for draw_circle
        "y": <number>,            // for draw_circle
        "radius": <number>,       // for draw_circle
        "percent": <number>       // for adjust_brightness
      }

      Only return JSON. No explanations. Command: "${command}"
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    });

    const message = completion.choices[0].message.content.trim();
    const actionJSON = JSON.parse(message);

    return new Response(JSON.stringify(actionJSON), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "AI command execution failed", details: error.message }), { status: 500 });
  }
}
