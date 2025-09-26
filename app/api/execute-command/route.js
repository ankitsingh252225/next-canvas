import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const POST = async (req) => {
  try {
    const { command } = await req.json();

    if (!command) {
      return new Response(JSON.stringify({ error: "Command missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    });

    const message = completion.choices[0].message.content.trim();
    const actionJSON = JSON.parse(message);

    return new Response(JSON.stringify(actionJSON), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "AI command execution failed", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};


