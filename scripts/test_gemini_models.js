require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  console.log("Status:", res.status);
  const data = await res.json();
  if (data.models) {
    console.log("Available models:", data.models.map(m => m.name));
  } else {
    console.log("Response:", JSON.stringify(data, null, 2));
  }
}

listModels();
