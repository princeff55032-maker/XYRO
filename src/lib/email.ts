import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPass) return null;

  const cleanPass = smtpPass.replace(/\s+/g, "");

  // Gmail-specific transport with explicit port 465 SSL & timeouts for cloud/serverless reliability
  if (process.env.EMAIL_PROVIDER === "gmail" || smtpUser.includes("@gmail.com")) {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: cleanPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: cleanPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Universal email dispatcher:
 * 1. Checks Gmail / SMTP (via Nodemailer)
 * 2. Checks Resend (via REST API)
 * 3. Falls back to console log in development
 */
export async function sendAppEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const smtpUser = process.env.SMTP_USER;
  const fromEmail =
    process.env.EMAIL_FROM ||
    (smtpUser ? `"XYRO Fitness" <${smtpUser}>` : "XYRO Fitness <noreply@xyro.fitness>");
  const normalizedTo = options.to.trim().toLowerCase();
  let lastError: string | undefined;

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
      lastError = `Gmail SMTP Error: ${err?.message || err}`;
      console.error("[Gmail SMTP Error]:", err?.message || err);
    }
  } else {
    lastError = "SMTP credentials (SMTP_USER / SMTP_PASS) not configured in environment";
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
      } else {
        const errorText = await res.text();
        lastError = `Resend Error: ${errorText}`;
      }
    } catch (sendErr: any) {
      lastError = `Resend Fetch Error: ${sendErr?.message || sendErr}`;
      console.error("[Resend API Error]:", sendErr);
    }
  }

  console.warn(`[Email Delivery Failed]: ${lastError} | Target: ${normalizedTo}`);
  return {
    ok: false,
    error: lastError || "No active email service configured",
  };
}
