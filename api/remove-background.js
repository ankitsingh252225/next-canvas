import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end(); // Only POST

  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "Image missing" });

  try {
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
      return res.status(response.status).json({ error: errText });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    res.status(200).json({ result: base64Image });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
