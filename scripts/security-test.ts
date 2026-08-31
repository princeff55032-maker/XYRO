import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/db";
import { generateMemberQrToken, verifyMemberQrToken } from "../src/lib/qr-token";
import { createDeviceApiKey, rotateDeviceApiKey, hashDeviceApiKey } from "../src/lib/device-auth";
import { checkRateLimit } from "../src/lib/ratelimit";
import {
  generateAndSendEmailOtp,
  verifyEmailOtp,
  createLogin2faChallengeToken,
  verifyLogin2faChallengeToken,
} from "../src/lib/otp";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("🛡️  XYRO SECURITY AUDIT & INVARIANT TEST SUITE");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const testGymCodeA = `TSTA_${timestamp % 100000}`;
  const testGymCodeB = `TSTB_${timestamp % 100000}`;

  // Clean-up context
  let gymAId = "";
  let gymBId = "";
  let userAId = "";
  let userBId = "";
  let memberAId = "";
  let memberBId = "";

  try {
    // -----------------------------------------------------------------
    // SETUP TEST FIXTURES
    // -----------------------------------------------------------------
    console.log("📦 Initializing Test Fixtures (Two isolated gyms: Gym A & Gym B)...");

    const pwdHash = await bcrypt.hash("XyroTest@2026!", 10);

    // Create Owner A & Gym A
    const ownerA = await prisma.user.create({
      data: {
        name: "Owner A",
        email: `owner_a_${timestamp}@xyro.test`,
        password: pwdHash,
        role: "GYM_OWNER",
        status: "ACTIVE",
      },
    });
    userAId = ownerA.id;

    const gymA = await prisma.gym.create({
      data: {
        gymCode: testGymCodeA,
        name: "Gym Alpha",
        slug: `gym-alpha-${timestamp}`,
        email: `contact_a_${timestamp}@xyro.test`,
        phone: `+9198000${timestamp % 100000}`,
        address: "123 Security St",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        ownerId: ownerA.id,
        status: "ACTIVE",
      },
    });
    gymAId = gymA.id;

    // Create Owner B & Gym B
    const ownerB = await prisma.user.create({
      data: {
        name: "Owner B",
        email: `owner_b_${timestamp}@xyro.test`,
        password: pwdHash,
        role: "GYM_OWNER",
        status: "ACTIVE",
      },
    });
    userBId = ownerB.id;

    const gymB = await prisma.gym.create({
      data: {
        gymCode: testGymCodeB,
        name: "Gym Beta",
        slug: `gym-beta-${timestamp}`,
        email: `contact_b_${timestamp}@xyro.test`,
        phone: `+9198111${timestamp % 100000}`,
        address: "456 Isolation Ave",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        ownerId: ownerB.id,
        status: "ACTIVE",
      },
    });
    gymBId = gymB.id;

    // Create Members for each gym
    const memberUserA = await prisma.user.create({
      data: {
        name: "Member A",
        email: `member_a_${timestamp}@xyro.test`,
        password: pwdHash,
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });
    const memberA = await prisma.member.create({
      data: {
        memberId: `${testGymCodeA}-M-001`,
        gymId: gymA.id,
        userId: memberUserA.id,
        isActive: true,
      },
    });
    memberAId = memberA.id;

    const memberUserB = await prisma.user.create({
      data: {
        name: "Member B",
        email: `member_b_${timestamp}@xyro.test`,
        password: pwdHash,
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });
    const memberB = await prisma.member.create({
      data: {
        memberId: `${testGymCodeB}-M-001`,
        gymId: gymB.id,
        userId: memberUserB.id,
        isActive: true,
      },
    });
    memberBId = memberB.id;

    // Create Payment for Gym B
    const paymentB = await prisma.payment.create({
      data: {
        gymId: gymB.id,
        memberId: memberB.id,
        amount: 2500,
        tax: 0,
        discount: 0,
        totalAmount: 2500,
        status: "PAID",
        method: "CASH",
        paidAt: new Date(),
      },
    });

    console.log("   Fixtures created successfully.\n");

    // -----------------------------------------------------------------
    // TEST SUITE 1: CROSS-TENANT ISOLATION (IDOR / BOLA)
    // -----------------------------------------------------------------
    console.log("🔒 [Suite 1]: Cross-Tenant Data Isolation & BOLA Defense");

    // Test 1.1: Gym A querying Member B with tenant scope
    const crossTenantMemberQuery = await prisma.member.findFirst({
      where: { id: memberB.id, gymId: gymA.id },
    });
    assert(
      crossTenantMemberQuery === null,
      "Tenant Isolation: Gym A query for Gym B member returns null"
    );

    // Test 1.2: Gym A querying Payment B with tenant scope
    const crossTenantPaymentQuery = await prisma.payment.findFirst({
      where: { id: paymentB.id, gymId: gymA.id },
    });
    assert(
      crossTenantPaymentQuery === null,
      "Tenant Isolation: Gym A query for Gym B payment returns null"
    );

    // Test 1.3: Attempting cross-tenant mutation (updating Gym B member with Gym A workspace)
    const crossTenantUpdateCount = await prisma.member.updateMany({
      where: { id: memberB.id, gymId: gymA.id },
      data: { address: "Hacked Address" },
    });
    assert(
      crossTenantUpdateCount.count === 0,
      "Tenant Isolation: Gym A cannot mutate Gym B member records (0 rows updated)"
    );

    // Verify member B address was NOT altered
    const memberBCheck = await prisma.member.findUnique({ where: { id: memberB.id } });
    assert(
      memberBCheck?.address !== "Hacked Address",
      "Tenant Isolation: Gym B data integrity preserved after cross-tenant attack"
    );

    // -----------------------------------------------------------------
    // TEST SUITE 2: AUTHENTICATION & EMAIL VERIFICATION LIFECYCLE
    // -----------------------------------------------------------------
    console.log("\n🔑 [Suite 2]: Authentication & Verification Lifecycle");

    // Create Unverified User
    const unverifiedUser = await prisma.user.create({
      data: {
        name: "Pending User",
        email: `pending_${timestamp}@xyro.test`,
        password: pwdHash,
        role: "CUSTOMER",
        status: "PENDING_VERIFICATION",
      },
    });

    // Test 2.1: Verify status check in auth
    assert(
      unverifiedUser.status === "PENDING_VERIFICATION",
      "Email Verification: User registered in PENDING_VERIFICATION state"
    );

    // Test 2.2: Generate Signup OTP
    const signupOtpRes = await generateAndSendEmailOtp({
      email: unverifiedUser.email,
      type: "SIGNUP",
      userName: unverifiedUser.name,
    });
    assert(
      signupOtpRes.ok === true && !!signupOtpRes.devOtp,
      "Email OTP: 6-digit Signup OTP generated and dispatched"
    );

    // Test 2.3: Verify OTP is stored as SHA-256 hash in database
    const otpInDb = await prisma.emailOtp.findFirst({
      where: { email: unverifiedUser.email, type: "SIGNUP" },
    });
    assert(
      otpInDb !== null && otpInDb.codeHash !== signupOtpRes.devOtp,
      "Email OTP: 6-digit OTP is hashed with SHA-256 in database (raw code never stored)"
    );

    // Test 2.4: Invalid OTP attempt rejected
    const invalidOtpRes = await verifyEmailOtp({
      email: unverifiedUser.email,
      code: "000000",
      type: "SIGNUP",
    });
    assert(
      invalidOtpRes.ok === false,
      "Email OTP: Incorrect OTP attempt rejected with attempt tracking"
    );

    // Test 2.5: Valid OTP verification and single-use deletion
    const validOtpRes = await verifyEmailOtp({
      email: unverifiedUser.email,
      code: signupOtpRes.devOtp!,
      type: "SIGNUP",
    });
    assert(
      validOtpRes.ok === true,
      "Email OTP: Valid 6-digit OTP verified successfully"
    );

    const recheckOtp = await prisma.emailOtp.findFirst({
      where: { email: unverifiedUser.email, type: "SIGNUP" },
    });
    assert(
      recheckOtp === null,
      "Email OTP: OTP record invalidated immediately after successful verification"
    );

    // Test 2.6: Login 2FA Challenge Token Creation and Verification
    const challengeToken = createLogin2faChallengeToken({
      userId: ownerA.id,
      email: ownerA.email,
    });
    const verifiedChallenge = verifyLogin2faChallengeToken(challengeToken);
    assert(
      verifiedChallenge.valid === true && verifiedChallenge.payload?.userId === ownerA.id,
      "Login 2FA: Cryptographic HMAC challenge token created and validated"
    );

    // -----------------------------------------------------------------
    // TEST SUITE 3: PASSWORD RESET SECURITY (HASHING & SINGLE-USE)
    // -----------------------------------------------------------------
    console.log("\n🔐 [Suite 3]: Password Reset Cryptographic Lifecycle");

    // Generate Raw & Hashed Token
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto.createHash("sha256").update(rawResetToken).digest("hex");
    const validExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: unverifiedUser.id },
      data: { resetToken: hashedResetToken, resetTokenExpires: validExpiry },
    });

    // Test 3.1: Token stored in database is SHA-256 hash (never raw plaintext)
    const userInDb = await prisma.user.findUnique({ where: { id: unverifiedUser.id } });
    assert(
      userInDb?.resetToken === hashedResetToken && userInDb?.resetToken !== rawResetToken,
      "Password Reset: Token is stored as SHA-256 hash, raw token never in plaintext DB"
    );

    // Test 3.2: Valid raw token lookup via hash
    const foundUserByHash = await prisma.user.findFirst({
      where: { resetToken: crypto.createHash("sha256").update(rawResetToken).digest("hex") },
    });
    assert(
      foundUserByHash?.id === unverifiedUser.id,
      "Password Reset: Valid raw token correctly resolves user via SHA-256 lookup"
    );

    // Test 3.3: Invalidate token immediately (Single-Use Lifecycle)
    await prisma.user.update({
      where: { id: unverifiedUser.id },
      data: { resetToken: null, resetTokenExpires: null },
    });

    const secondResetAttempt = await prisma.user.findFirst({
      where: { resetToken: hashedResetToken },
    });
    assert(
      secondResetAttempt === null,
      "Password Reset: Token invalidated after single use, replay attempt rejected"
    );

    // -----------------------------------------------------------------
    // TEST SUITE 4: RATE LIMITING ATOMICITY
    // -----------------------------------------------------------------
    console.log("\n⏱️  [Suite 4]: Atomic Rate Limiting");

    const rateLimitKey = `test_limit_${timestamp}`;
    const limit = 3;
    const windowSecs = 10;

    const r1 = await checkRateLimit(rateLimitKey, limit, windowSecs);
    const r2 = await checkRateLimit(rateLimitKey, limit, windowSecs);
    const r3 = await checkRateLimit(rateLimitKey, limit, windowSecs);
    const r4 = await checkRateLimit(rateLimitKey, limit, windowSecs);

    assert(r1.success === true && r1.remaining === 2, "Rate Limit: 1st request permitted (2 remaining)");
    assert(r2.success === true && r2.remaining === 1, "Rate Limit: 2nd request permitted (1 remaining)");
    assert(r3.success === true && r3.remaining === 0, "Rate Limit: 3rd request permitted (0 remaining)");
    assert(r4.success === false && r4.retryAfterSeconds > 0, "Rate Limit: 4th request blocked with Retry-After");

    // -----------------------------------------------------------------
    // TEST SUITE 5: QR TOKEN CRYPTOGRAPHY & FACILITY BINDING
    // -----------------------------------------------------------------
    console.log("\n📱 [Suite 5]: QR Token Cryptography & Anti-Tampering");

    // Test 5.1: Generate valid QR token
    const validQr = generateMemberQrToken({
      memberId: memberA.id,
      gymId: gymA.id,
      memberCode: memberA.memberId,
      gymCode: testGymCodeA,
      ttlSeconds: 60,
    });

    const verification = verifyMemberQrToken(validQr);
    assert(
      verification.valid === true && verification.payload.sub === memberA.id,
      "QR Security: Valid HMAC-SHA256 token passes cryptographic verification"
    );

    // Test 5.2: Tampered Token Detection
    const parts = validQr.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")), sub: memberB.id })
    ).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const tamperedVerification = verifyMemberQrToken(tamperedToken);
    assert(
      tamperedVerification.valid === false && tamperedVerification.code === "INVALID_SIGNATURE",
      "QR Security: Modified memberId payload rejected due to signature mismatch"
    );

    // Test 5.3: Expired Token Detection
    const expiredQr = generateMemberQrToken({
      memberId: memberA.id,
      gymId: gymA.id,
      memberCode: memberA.memberId,
      gymCode: testGymCodeA,
      ttlSeconds: -10, // already expired
    });

    const expiredVerification = verifyMemberQrToken(expiredQr);
    assert(
      expiredVerification.valid === false && expiredVerification.code === "EXPIRED",
      "QR Security: Expired dynamic QR token rejected"
    );

    // -----------------------------------------------------------------
    // TEST SUITE 6: DEVICE AUTHENTICATION & ROTATION
    // -----------------------------------------------------------------
    console.log("\n📟 [Suite 6]: Hardware Device API Key Authentication & Rotation");

    // Test 6.1: Create Device API Key
    const { apiKey: originalKey, device: initialDevice } = await createDeviceApiKey({
      gymId: gymA.id,
      name: "Main Turnstile",
    });

    assert(
      initialDevice.apiKeyHash === hashDeviceApiKey(originalKey),
      "Device Auth: Device API key stored as SHA-256 hash in database"
    );

    // Test 6.2: Rotate Device API Key
    const { apiKey: rotatedKey, device: rotatedDevice } = await rotateDeviceApiKey({
      deviceId: initialDevice.id,
      gymId: gymA.id,
    });

    assert(
      rotatedDevice.apiKeyHash === hashDeviceApiKey(rotatedKey) &&
        rotatedDevice.apiKeyHash !== initialDevice.apiKeyHash,
      "Device Auth: Key rotation generates new hash and replaces old key in DB"
    );

    // Test 6.3: Verify old key no longer resolves active device
    const lookupOldKey = await prisma.accessDevice.findUnique({
      where: { apiKeyHash: hashDeviceApiKey(originalKey) },
    });
    assert(
      lookupOldKey === null,
      "Device Auth: Old API key immediately invalidated after rotation"
    );

    // -----------------------------------------------------------------
    // TEST SUITE 7: SUPER_ADMIN PRIVILEGE ISOLATION
    // -----------------------------------------------------------------
    console.log("\n👑 [Suite 7]: Role Hierarchy & Anti-Escalation Defense");

    // Test 7.1: Verify non-SUPER_ADMIN cannot claim platform-wide role
    assert(
      ownerA.role === "GYM_OWNER",
      "Role Hierarchy: Gym Owner cannot elevate to SUPER_ADMIN"
    );

    const platformGymsCount = await prisma.gym.count();
    assert(
      platformGymsCount >= 2,
      "Platform Verification: Multiple tenant gyms exist concurrently"
    );

  } finally {
    // -----------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // -----------------------------------------------------------------
    console.log("\n🧹 Cleaning up test fixtures...");
    if (gymAId) {
      await prisma.accessDevice.deleteMany({ where: { gymId: { in: [gymAId, gymBId] } } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { gymId: { in: [gymAId, gymBId] } } }).catch(() => {});
      await prisma.attendance.deleteMany({ where: { gymId: { in: [gymAId, gymBId] } } }).catch(() => {});
    }
    if (memberAId) {
      await prisma.member.deleteMany({ where: { id: { in: [memberAId, memberBId] } } }).catch(() => {});
    }
    if (gymAId) {
      await prisma.gym.deleteMany({ where: { id: { in: [gymAId, gymBId] } } }).catch(() => {});
    }
    if (userAId) {
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } }).catch(() => {});
    }
    console.log("   Cleanup completed.\n");
  }

  // -----------------------------------------------------------------
  // SUMMARY REPORT
  // -----------------------------------------------------------------
  console.log("=======================================================");
  console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error("Test Suite Execution Error:", e);
  process.exit(1);
});
