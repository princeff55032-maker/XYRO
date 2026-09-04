import prisma from "@/lib/db";
import { sendAppEmail } from "@/lib/email";
import { formatDate } from "@/lib/utils";

interface SendInvoiceEmailParams {
  gymId: string;
  memberId: string;
  paymentId: string;
  membershipId?: string | null;
}

export interface InvoiceEmailResult {
  sent: boolean;
  recipientEmail?: string;
  invoiceNumber?: string;
  reason?: string;
  error?: string;
}

/**
 * Builds a responsive, tax-compliant HTML email for membership invoices & payment receipts.
 */
function renderInvoiceEmailHtml(params: {
  gymName: string;
  gymEmail?: string | null;
  gymPhone?: string | null;
  gymAddress?: string | null;
  memberName: string;
  memberIdStr: string;
  planName: string;
  durationDays: number;
  startDateStr: string;
  endDateStr: string;
  invoiceNumber: string;
  paymentDateStr: string;
  paymentMethod: string;
  baseAmount: number;
  discount: number;
  tax: number;
  totalAmount: number;
  notes?: string | null;
  portalUrl: string;
}): string {
  const {
    gymName,
    gymEmail,
    gymPhone,
    gymAddress,
    memberName,
    memberIdStr,
    planName,
    durationDays,
    startDateStr,
    endDateStr,
    invoiceNumber,
    paymentDateStr,
    paymentMethod,
    baseAmount,
    discount,
    tax,
    totalAmount,
    notes,
    portalUrl,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt &amp; Tax Invoice - ${invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #F7F5F0;
      color: #33281E;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 24px auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #E5D9C5;
      box-shadow: 0 4px 24px rgba(51, 40, 30, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #2B2118 0%, #1A130E 100%);
      padding: 32px 28px;
      color: #FFFFFF;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: rgba(139, 94, 52, 0.35);
      border: 1px solid #8B5E34;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #E5D9C5;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #D4C3B3;
    }
    .status-bar {
      background-color: #F0FDF4;
      border-bottom: 1px solid #DCFCE7;
      padding: 12px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .status-badge {
      display: inline-block;
      background-color: #166534;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .invoice-id {
      font-family: monospace;
      font-size: 12px;
      color: #166534;
      font-weight: 700;
    }
    .content {
      padding: 28px;
    }
    .greeting {
      font-size: 15px;
      line-height: 1.5;
      color: #33281E;
      margin-bottom: 24px;
    }
    .card-box {
      background-color: #FAF9F7;
      border: 1px solid #E5D9C5;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #8B5E34;
      margin: 0 0 12px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .row:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #8C7A6B;
    }
    .value {
      color: #33281E;
      font-weight: 600;
      text-align: right;
    }
    .table-container {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 13px;
    }
    .table-container th {
      text-align: left;
      padding: 8px 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #8C7A6B;
      border-bottom: 1px solid #E5D9C5;
    }
    .table-container td {
      padding: 10px 0;
      border-bottom: 1px solid #F0ECE6;
    }
    .total-highlight {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background-color: #8B5E34;
      color: #FFFFFF;
      border-radius: 10px;
      margin-top: 16px;
    }
    .total-highlight .total-label {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .total-highlight .total-val {
      font-size: 20px;
      font-weight: 800;
      font-family: monospace;
    }
    .btn-portal {
      display: block;
      width: fit-content;
      margin: 28px auto 8px auto;
      padding: 14px 28px;
      background-color: #8B5E34;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      border-radius: 10px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(139, 94, 52, 0.25);
    }
    .footer {
      background-color: #FAF9F7;
      border-top: 1px solid #E5D9C5;
      padding: 20px 28px;
      text-align: center;
      font-size: 11px;
      color: #8C7A6B;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <div class="logo-badge">Official Tax Receipt</div>
      <h1>${gymName}</h1>
      <p>Powered by XYRO Fitness Intelligence</p>
    </div>

    <!-- Status Bar -->
    <table width="100%" cellpadding="0" cellspacing="0" class="status-bar">
      <tr>
        <td style="padding: 12px 28px;">
          <span class="status-badge">Payment Confirmed</span>
        </td>
        <td style="padding: 12px 28px; text-align: right;">
          <span class="invoice-id">${invoiceNumber}</span>
        </td>
      </tr>
    </table>

    <!-- Main Content -->
    <div class="content">
      <p class="greeting">
        Hi <strong>${memberName}</strong>,<br>
        Thank you for your payment. Your membership plan has been successfully activated at <strong>${gymName}</strong>! Below are the complete transaction and invoice details for your records.
      </p>

      <!-- Plan Activation Card -->
      <div class="card-box">
        <div class="card-title">Membership Plan Activated</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr class="row">
            <td class="label" style="padding: 4px 0;">Plan Name:</td>
            <td class="value" style="padding: 4px 0; text-align: right;">${planName}</td>
          </tr>
          <tr class="row">
            <td class="label" style="padding: 4px 0;">Duration:</td>
            <td class="value" style="padding: 4px 0; text-align: right;">${durationDays} Days</td>
          </tr>
          <tr class="row">
            <td class="label" style="padding: 4px 0;">Start Date:</td>
            <td class="value" style="padding: 4px 0; text-align: right;">${startDateStr}</td>
          </tr>
          <tr class="row">
            <td class="label" style="padding: 4px 0;">Valid Until (Expiry):</td>
            <td class="value" style="padding: 4px 0; text-align: right; color: #8B5E34;">${endDateStr}</td>
          </tr>
          <tr class="row">
            <td class="label" style="padding: 4px 0;">Member Code:</td>
            <td class="value" style="padding: 4px 0; text-align: right; font-family: monospace;">${memberIdStr}</td>
          </tr>
        </table>
      </div>

      <!-- Payment & Tax Breakdown -->
      <div class="card-box">
        <div class="card-title">Fee Breakdown &amp; Tax Details</div>
        <table class="table-container">
          <thead>
            <tr>
              <th style="padding: 6px 0;">Description</th>
              <th style="padding: 6px 0; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px 0; color: #33281E;">
                <strong>${planName}</strong> (${durationDays} Days)
              </td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: 600;">
                ₹${baseAmount.toFixed(2)}
              </td>
            </tr>
            ${
              discount > 0
                ? `<tr>
              <td style="padding: 6px 0; color: #166534;">Promo / Plan Discount:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace; color: #166534;">
                - ₹${discount.toFixed(2)}
              </td>
            </tr>`
                : ""
            }
            ${
              tax > 0
                ? `<tr>
              <td style="padding: 6px 0; color: #8C7A6B;">Taxes &amp; GST:</td>
              <td style="padding: 6px 0; text-align: right; font-family: monospace;">
                + ₹${tax.toFixed(2)}
              </td>
            </tr>`
                : ""
            }
          </tbody>
        </table>

        <div class="total-highlight">
          <span class="total-label">Total Amount Paid</span>
          <span class="total-val">₹${totalAmount.toFixed(2)}</span>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 14px; font-size: 12px; color: #8C7A6B;">
          <tr>
            <td style="padding: 3px 0;">Payment Method:</td>
            <td style="padding: 3px 0; text-align: right; font-weight: 600; color: #33281E;">
              ${paymentMethod}
            </td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">Transaction Date:</td>
            <td style="padding: 3px 0; text-align: right; font-weight: 600; color: #33281E;">
              ${paymentDateStr}
            </td>
          </tr>
          ${
            notes
              ? `<tr>
            <td style="padding: 3px 0;">Remarks / Ref:</td>
            <td style="padding: 3px 0; text-align: right; color: #33281E;">
              ${notes}
            </td>
          </tr>`
              : ""
          }
        </table>
      </div>

      <!-- Member Portal CTA -->
      <div style="text-align: center; margin: 24px 0 12px 0;">
        <a href="${portalUrl}" class="btn-portal" target="_blank">
          Open Member Portal &amp; QR Pass &rarr;
        </a>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #8C7A6B;">
          Check your attendance records, scan your digital QR, and view workout plans.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 6px 0;">
        <strong>${gymName}</strong>
        ${gymAddress ? ` &bull; ${gymAddress}` : ""}
      </p>
      <p style="margin: 0;">
        Need help or have questions regarding your plan? Contact us at 
        ${gymPhone ? `<strong>${gymPhone}</strong>` : ""} 
        ${gymEmail ? ` or <strong>${gymEmail}</strong>` : ""}.
      </p>
      <p style="margin: 12px 0 0 0; font-size: 10px; color: #A89A8D;">
        This is an automated tax invoice and payment acknowledgment issued by XYRO on behalf of ${gymName}.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Dispatches an automated branded invoice & receipt email to a member.
 * Safe & resilient: handles missing configs or invalid emails without throwing unhandled exceptions.
 */
export async function sendMemberInvoiceEmail(
  params: SendInvoiceEmailParams
): Promise<InvoiceEmailResult> {
  try {
    const { gymId, memberId, paymentId } = params;

    // 1. Fetch Gym & Settings
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: { settings: true },
    });
    if (!gym) {
      return { sent: false, reason: "Gym not found" };
    }

    // Check if Gym has email notifications enabled
    if (gym.settings && gym.settings.enableEmail === false) {
      console.log(`[Invoice Email Skipped]: Email notifications are disabled for gym ${gym.name}`);
      return { sent: false, reason: "email_disabled_in_gym_settings" };
    }

    // 2. Fetch Payment with Member, User, and Membership details
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        member: {
          include: {
            user: true,
          },
        },
        membership: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!payment || !payment.member) {
      return { sent: false, reason: "Payment or member record not found" };
    }

    const member = payment.member;
    const recipientEmail = member.user?.email?.trim();

    // 3. Verify recipient has a legitimate email
    if (
      !recipientEmail ||
      recipientEmail.endsWith("@xyro.local") ||
      !recipientEmail.includes("@")
    ) {
      console.log(`[Invoice Email Skipped]: Member ${member.memberId} does not have a valid external email (${recipientEmail})`);
      return { sent: false, recipientEmail, reason: "no_valid_recipient_email" };
    }

    // 4. Resolve Membership and Plan details
    let planName = payment.membership?.plan?.name;
    let durationDays = payment.membership?.plan?.durationDays || 30;
    let startDate = payment.membership?.startDate || payment.paidAt || payment.createdAt;
    let endDate = payment.membership?.endDate;

    // If membership wasn't linked on payment, lookup member's latest active membership
    if (!payment.membership) {
      const activeMembership = await prisma.membership.findFirst({
        where: { memberId: member.id, gymId: gym.id },
        orderBy: { createdAt: "desc" },
        include: { plan: true },
      });
      if (activeMembership) {
        planName = activeMembership.plan?.name;
        durationDays = activeMembership.plan?.durationDays || 30;
        startDate = activeMembership.startDate;
        endDate = activeMembership.endDate;
      }
    }

    if (!endDate) {
      endDate = new Date(startDate.getTime() + durationDays * 86400000);
    }

    const invoiceNumber = `INV-${payment.id.slice(-6).toUpperCase()}`;
    const paymentDateStr = formatDate(payment.paidAt || payment.createdAt);
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xyro.fitness";
    const portalUrl = `${appUrl}/member`;

    // 5. Create or upsert tax invoice record in prisma.invoice for auditing/download
    try {
      await prisma.invoice.upsert({
        where: { paymentId: payment.id },
        create: {
          invoiceNumber,
          gymId: gym.id,
          paymentId: payment.id,
          gymName: gym.name,
          gymAddress: gym.address,
          memberName: member.user?.name || "Member",
          memberEmail: recipientEmail,
          memberPhone: member.user?.phone,
          items: [
            {
              description: `${planName || "Membership"} (${durationDays} Days)`,
              amount: payment.amount,
            },
          ],
          subtotal: payment.amount,
          tax: payment.tax,
          discount: payment.discount,
          total: payment.totalAmount,
          notes: payment.notes,
          issuedAt: payment.paidAt || new Date(),
        },
        update: {
          total: payment.totalAmount,
          updatedAt: new Date(),
        },
      });
    } catch (invErr) {
      // Don't halt email delivery if invoice table upsert encounters duplicate or constraint
      console.warn("[Invoice Record Note]:", invErr);
    }

    // 6. Generate HTML & Plain text
    const html = renderInvoiceEmailHtml({
      gymName: gym.name,
      gymEmail: gym.email,
      gymPhone: gym.phone,
      gymAddress: gym.address,
      memberName: member.user?.name || "Athlete",
      memberIdStr: member.memberId,
      planName: planName || "Gym Membership",
      durationDays,
      startDateStr,
      endDateStr,
      invoiceNumber,
      paymentDateStr,
      paymentMethod: payment.method.replace(/_/g, " "),
      baseAmount: payment.amount,
      discount: payment.discount,
      tax: payment.tax,
      totalAmount: payment.totalAmount,
      notes: payment.notes,
      portalUrl,
    });

    const plainText = `Payment Receipt & Tax Invoice — ${gym.name}
Invoice Number: ${invoiceNumber}
Member: ${member.user?.name || "Athlete"} (${member.memberId})
Plan: ${planName || "Gym Membership"} (${durationDays} Days)
Validity: ${startDateStr} to ${endDateStr}
Total Paid: ₹${payment.totalAmount} via ${payment.method.replace(/_/g, " ")}
Date: ${paymentDateStr}

Open your member portal: ${portalUrl}
Thank you for training with ${gym.name}!`;

    // 7. Dispatch Email
    const result = await sendAppEmail({
      to: recipientEmail,
      subject: `Payment Receipt & Plan Activated: ${invoiceNumber} — ${gym.name}`,
      html,
      text: plainText,
    });

    if (result.ok) {
      console.log(`[Invoice Email Sent]: ${invoiceNumber} delivered to ${recipientEmail} for member ${member.memberId}`);
      return { sent: true, recipientEmail, invoiceNumber };
    } else {
      console.error(`[Invoice Email Dispatch Failed]: ${result.error}`);
      return { sent: false, recipientEmail, invoiceNumber, error: result.error };
    }
  } catch (err: any) {
    console.error("[sendMemberInvoiceEmail Critical Error]:", err?.message || err);
    return { sent: false, error: err?.message || String(err) };
  }
}
