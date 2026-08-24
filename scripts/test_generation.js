require('dotenv').config();

async function testGeneration() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: "Explain what XYRO is as a gym SaaS platform in 2 concise sentences." }],
        },
      ],
    }),
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Reply:\n", data.candidates?.[0]?.content?.parts?.[0]?.text);
}

testGeneration();
