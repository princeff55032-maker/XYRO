import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

/**
 * Validates cryptographic webhook signatures (Cashfree / Razorpay / Stripe standard)
 */
function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  // 1. Cashfree Signature Scheme: HMAC-SHA256(timestamp + rawBody, secret)
  if (timestampHeader) {
    const computed = crypto
      .createHmac("sha256", secret)
      .update(`${timestampHeader}${rawBody}`)
      .digest("base64");

    const sigBuffer = Buffer.from(signatureHeader);
    const compBuffer = Buffer.from(computed);
    if (sigBuffer.length === compBuffer.length && crypto.timingSafeEqual(sigBuffer, compBuffer)) {
      return true;
    }
  }

  // 2. Standard HMAC-SHA256 hex signature scheme
  const hexComputed = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const sigHexBuffer = Buffer.from(signatureHeader);
  const compHexBuffer = Buffer.from(hexComputed);
  if (sigHexBuffer.length === compHexBuffer.length && crypto.timingSafeEqual(sigHexBuffer, compHexBuffer)) {
    return true;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-cashfree-signature") ||
      req.headers.get("x-razorpay-signature");
    const timestamp =
      req.headers.get("x-webhook-timestamp") ||
      req.headers.get("x-cashfree-timestamp");

    const webhookSecret =
      process.env.PAYMENT_WEBHOOK_SECRET ||
      process.env.CASHFREE_CLIENT_SECRET ||
      process.env.AUTH_SECRET ||
      "";

    // 1. Verify Cryptographic Webhook Signature
    if (process.env.NODE_ENV === "production" || webhookSecret) {
      const isValidSig = verifyWebhookSignature(rawBody, signature, timestamp, webhookSecret);
      if (!isValidSig) {
        console.warn("[Payment Webhook]: Invalid signature rejected.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }

    // Support Cashfree & Generic Payload formats
    const eventType = payload.type || payload.event || "PAYMENT_SUCCESS";
    const data = payload.data || payload;

    const orderId = data.order_id || data.orderId || data.paymentId;
    const transactionId = data.payment_id || data.transactionId || data.referenceId || orderId;
    const amount = Number(data.order_amount || data.amount || 0);
    const currency = (data.order_currency || data.currency || "INR").toUpperCase();
    const paymentStatus = (data.payment_status || data.status || "").toUpperCase();

    if (!orderId || !transactionId) {
      return NextResponse.json({ error: "Missing order or transaction ID" }, { status: 400 });
    }

    // Only process successful payment events
    if (paymentStatus !== "SUCCESS" && eventType !== "PAYMENT_SUCCESS") {
      return NextResponse.json({ received: true, ignored: true, reason: "Non-success event status" });
    }

    // 2. Lookup existing Payment record by order ID or ID
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: orderId },
          { transactionId: transactionId },
          { notes: { contains: orderId } },
        ],
      },
      include: {
        gym: true,
        member: { include: { user: true } },
        membership: { include: { plan: true } },
      },
    });

    if (!existingPayment) {
      console.warn(`[Payment Webhook]: No matching payment record found for order ${orderId}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. IDEMPOTENCY GUARD: If payment was already marked PAID, return 200 without duplicate execution
    if (existingPayment.status === "PAID" && existingPayment.transactionId === transactionId) {
      return NextResponse.json({ received: true, status: "ALREADY_PROCESSED" });
    }

    // 4. Amount and Currency Sanity Validation
    if (existingPayment.totalAmount > 0 && amount > 0 && Math.abs(existingPayment.totalAmount - amount) > 1.0) {
      console.error(`[Payment Webhook]: Amount mismatch on order ${orderId}. Expected ${existingPayment.totalAmount}, got ${amount}`);
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // 5. Execute Atomic State Transition
    await prisma.$transaction(async (tx) => {
      // Mark Payment as PAID
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: "PAID",
          transactionId: String(transactionId),
          paidAt: new Date(),
          method: "ONLINE",
        },
      });

      // Activate or Extend Membership
      if (existingPayment.membershipId) {
        const membership = existingPayment.membership;
        if (membership) {
          const planDays = membership.plan?.durationDays || 30;
          const currentEnd = membership.endDate > new Date() ? membership.endDate : new Date();
          const newEnd = new Date(currentEnd.getTime() + planDays * 86400000);

          await tx.membership.update({
            where: { id: membership.id },
            data: {
              status: "ACTIVE",
              startDate: membership.startDate || new Date(),
              endDate: newEnd,
              daysRemaining: planDays,
            },
          });
        }
      }
    });

    // 6. Record Audit Log
    await logAuditEvent({
      userId: existingPayment.member.userId,
      gymId: existingPayment.gymId,
      action: "PAYMENT_ONLINE_SUCCESS",
      resource: "payment",
      resourceId: existingPayment.id,
      metadata: {
        orderId,
        transactionId,
        amount,
        currency,
        memberId: existingPayment.member.memberId,
      },
    });

    return NextResponse.json({
      received: true,
      status: "SUCCESS",
      paymentId: existingPayment.id,
    });
  } catch (error) {
    console.error("[Payment Webhook Error]:", error);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}
