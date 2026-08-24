require('dotenv').config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("API Key present:", !!apiKey, "Length:", apiKey ? apiKey.length : 0);

  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello, what is XYRO?" }] }],
        }),
      });
      console.log(`Model ${model} status:`, res.status);
      const text = await res.text();
      console.log(`Model ${model} response:`, text.slice(0, 200));
    } catch (e) {
      console.error(`Model ${model} fetch failed:`, e.message);
    }
  }
}

test();
