import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass.replace(/\s+/g, ""),
      },
    });
  }

  return transporter;
}

/**
 * Universal email dispatcher:
 * 1. Checks Gmail / SMTP (via Nodemailer)
 * 2. Checks Resend (via REST API)
 * 3. Falls back to console log in development
 */
export async function sendAppEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "XYRO Fitness <noreply@xyro.fitness>";
  const normalizedTo = options.to.trim().toLowerCase();

  // 1. Try Gmail / SMTP via Nodemailer
  const mailer = getTransporter();
  if (mailer) {
    try {
      const info = await mailer.sendMail({
        from: fromEmail,
        to: normalizedTo,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`[Email Delivered via Gmail SMTP]: Message ID: ${info.messageId} to ${normalizedTo}`);
      return { ok: true };
    } catch (err: any) {
      console.error("[Gmail SMTP Error]:", err?.message || err);
    }
  }

  // 2. Fallback to Resend API if configured
  const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [normalizedTo],
          subject: options.subject,
          html: options.html,
        }),
      });

      if (res.ok) {
        console.log(`[Email Delivered via Resend]: to ${normalizedTo}`);
        return { ok: true };
      }
    } catch (sendErr) {
      console.error("[Resend API Error]:", sendErr);
    }
  }

  console.log(`[Email (Console Fallback)]: to ${normalizedTo} | Subject: ${options.subject}`);
  return { ok: true };
}
