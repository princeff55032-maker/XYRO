require('dotenv').config();

async function testAll() {
  const apiKey = process.env.GEMINI_API_KEY;
  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(listUrl);
  const data = await res.json();

  const generateModels = data.models
    .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
    .map(m => m.name.replace("models/", ""));

  console.log("Supported generateContent models:", generateModels);

  for (const m of generateModels.slice(0, 5)) {
    const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    try {
      const r = await fetch(genUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello!" }] }],
        }),
      });
      console.log(`Model ${m} status:`, r.status);
      if (r.ok) {
        const d = await r.json();
        console.log(`Model ${m} SUCCESS:`, d.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
        break;
      }
    } catch (e) {
      console.log(`Model ${m} error:`, e.message);
    }
  }
}

testAll();
