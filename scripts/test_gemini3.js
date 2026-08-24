require('dotenv').config();

async function testGemini3() {
  const apiKey = process.env.GEMINI_API_KEY;
  const models = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3-flash-preview", "gemma-4-31b-it", "gemma-4-26b-a4b-it"];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Explain what XYRO is as a gym SaaS platform in 1 concise sentence." }],
          },
        ],
      }),
    });
    console.log(`Model ${model} Status:`, res.status);
    if (res.ok) {
      const data = await res.json();
      console.log(`Model ${model} Response:\n`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      break;
    }
  }
}

testGemini3();
