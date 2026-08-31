require("dotenv").config();
const crypto = require("crypto");

// 1. QR Token Testing
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64").toString("utf-8");
}

const secret = process.env.QR_SECRET || process.env.AUTH_SECRET || "test_secret_key_123456";

function generateTestToken(payload, customSecret = secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(payload));
  const msg = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", customSecret).update(msg).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${msg}.${sig}`;
}

function verifyTestToken(token, verifySecret = secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, error: "MALFORMED" };
  const [h, p, sig] = parts;
  const msg = `${h}.${p}`;
  const expectedSig = crypto.createHmac("sha256", verifySecret).update(msg).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  if (sig !== expectedSig) return { valid: false, error: "INVALID_SIGNATURE" };
  
  const payload = JSON.parse(base64UrlDecode(p));
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) return { valid: false, error: "EXPIRED" };
  return { valid: true, payload };
}

console.log("=========================================");
console.log("🛡️  XYRO SECURITY TEST SUITE");
console.log("=========================================\n");

let passed = 0;
let total = 0;

function assert(description, condition) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
  }
}

// TEST 1: Valid QR Token Verification
const now = Math.floor(Date.now() / 1000);
const validPayload = {
  sub: "mem_123",
  gymId: "gym_abc",
  memberCode: "GYM001-M-001",
  gymCode: "GYM001",
  iat: now,
  exp: now + 60,
  jti: "nonce-uuid-1",
};
const validToken = generateTestToken(validPayload);
const res1 = verifyTestToken(validToken);
assert("Valid server-signed QR token verified successfully", res1.valid === true && res1.payload.sub === "mem_123");

// TEST 2: Forged / Tampered QR Token Rejected
const forgedToken = validToken.slice(0, -4) + "AAAA";
const res2 = verifyTestToken(forgedToken);
assert("Forged signature rejected with INVALID_SIGNATURE", res2.valid === false && res2.error === "INVALID_SIGNATURE");

// TEST 3: Wrong Secret Rejected
const wrongSecretToken = generateTestToken(validPayload, "attacker_secret_key");
const res3 = verifyTestToken(wrongSecretToken);
assert("Token signed by unauthorized secret rejected", res3.valid === false && res3.error === "INVALID_SIGNATURE");

// TEST 4: Expired QR Token Rejected
const expiredPayload = { ...validPayload, iat: now - 120, exp: now - 60 };
const expiredToken = generateTestToken(expiredPayload);
const res4 = verifyTestToken(expiredToken);
assert("Expired QR token (>60s) rejected with EXPIRED", res4.valid === false && res4.error === "EXPIRED");

// TEST 5: CSV Formula Injection Neutralization
function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

assert("Formula =cmd|'/C calc'!A0 neutralized with leading quote", escapeCsvCell("=cmd|'/C calc'!A0") === `"'=cmd|'/C calc'!A0"`);
assert("Formula +12345 neutralized with leading quote", escapeCsvCell("+12345") === `"'+12345"`);
assert("Formula @SUM(A1:A10) neutralized with leading quote", escapeCsvCell("@SUM(A1:A10)") === `"'@SUM(A1:A10)"`);
assert("Normal text preserved normally", escapeCsvCell("Prince Gupta") === `"Prince Gupta"`);

// TEST 6: Rate Limiter Whitelist Strict Equality
const OWNER_WHITELIST = new Set(["prince@xyro.com", "admin@xyro.fitness"]);
function isOwnerWhitelisted(identifier) {
  if (!identifier) return false;
  const parts = identifier.toLowerCase().split(":");
  const candidate = parts[parts.length - 1]?.trim();
  return OWNER_WHITELIST.has(candidate);
}

assert("Platform owner email recognized strictly", isOwnerWhitelisted("login:127.0.0.1:prince@xyro.com") === true);
assert("Platform admin email recognized strictly", isOwnerWhitelisted("login:127.0.0.1:admin@xyro.fitness") === true);
assert("Attacker containing 'prince' as substring BLOCKED from whitelist", isOwnerWhitelisted("login:127.0.0.1:attacker_prince_fake@gmail.com") === false);
assert("Random user BLOCKED from whitelist", isOwnerWhitelisted("login:127.0.0.1:user@example.com") === false);

console.log(`\n=========================================`);
console.log(`Results: ${passed} / ${total} Tests Passed`);
console.log(`=========================================\n`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
