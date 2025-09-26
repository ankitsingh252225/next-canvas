import fetch from "node-fetch";

export const POST = async (req) => {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Image missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.REMOVE_BG_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_file_b64: imageBase64.replace(/^data:image\/(png|jpeg);base64,/, ""),
        size: "auto",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: "Remove.bg API error", details: errText }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    return new Response(JSON.stringify({ result: base64Image }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Background removal failed", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
