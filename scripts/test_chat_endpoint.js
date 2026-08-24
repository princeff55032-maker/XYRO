async function testEndpoint() {
  const res = await fetch("http://localhost:3000/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "How does the QR attendance check-in work for gym members?",
    }),
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("\n--- AI Reply ---");
  console.log(data.reply);
  console.log("\n--- Actions ---");
  console.log(data.actions);
}

testEndpoint();
