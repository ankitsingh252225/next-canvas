import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
  try {
    const { command } = await req.json();

    if (!command) return new Response(JSON.stringify({ error: "Command missing" }), { status: 400 });

    // --- Call OpenAI Chat Completion ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an assistant that converts natural language canvas commands into JSON actions."
        },
        {
          role: "user",
          content: `Convert this command to JSON: "${command}".
          Only respond with JSON like:
          { "action": "draw_circle", "x": 100, "y": 100, "radius": 50, "color": "red" }
          or { "action": "adjust_brightness", "percent": 20 }`
        }
      ]
    });

    const text = completion.choices[0].message.content;

    // --- Parse JSON safely ---
    let actionJSON;
    try { actionJSON = JSON.parse(text); } 
    catch { return new Response(JSON.stringify({ error: "Failed to parse JSON" }), { status: 500 }); }

    return new Response(JSON.stringify(actionJSON), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
