import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Privacy Policy — XYRO Gym Management Platform",
  description:
    "How XYRO Fitness Technologies collects, encrypts, processes, and safeguards gym facility data, member records, and biometric telemetry.",
};

export default function PrivacyPage() {
  const lastUpdated = "September 4, 2026";

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#33281E]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#E5D9C5] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="transition-transform hover:scale-105">
            <Logo />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C7A6B] hover:text-[#33281E] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl border border-[#E5D9C5] px-4 py-2 text-xs font-bold text-[#33281E] hover:border-[#8B5E34] hover:bg-[#FAF9F7] transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-primary inline-flex rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              Start Your Gym
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E5D9C5] bg-white px-3.5 py-1 text-xs font-semibold text-[#8B5E34] shadow-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Data Protection &amp; Privacy</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold text-[#33281E] md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[#8C7A6B]">
          Effective Date: {lastUpdated} · Version 2.4
        </p>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-8 md:p-14 shadow-[0_12px_40px_rgba(51,40,30,0.04)] space-y-10 text-sm leading-relaxed text-[#33281E]">
          {/* Highlight Card */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-xs text-emerald-900">
            <p className="font-semibold mb-1 text-emerald-950">Our Fundamental Privacy Commitment:</p>
            XYRO operates on a strict multi-tenant privacy model. Your facility&apos;s athletes, trainer commission logs, revenue numbers, and access telemetry belong exclusively to your gym. We do not sell or share your data with third-party advertisers.
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              1. Information We Collect
            </h2>
            <p>
              To provide institutional gym management operations, XYRO processes the following categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#5A4838]">
              <li>
                <strong>Facility Administrator &amp; Staff Data:</strong> Name, work email address, phone number, gym name, GSTIN (optional), physical facility address, and encrypted credentials.
              </li>
              <li>
                <strong>Member &amp; Athlete Data:</strong> Name, email address, phone number, emergency contact details, membership tier, renewal schedule, workout periodization logs, and dietary macronutrient targets.
              </li>
              <li>
                <strong>Attendance &amp; Access Telemetry:</strong> Check-in timestamps, QR token refresh events, turnstile relay verification logs, and floor occupancy counters.
              </li>
              <li>
                <strong>Payment &amp; Billing Data:</strong> Transaction references, GST tax invoices, payment mode (UPI, Cash, Cheque, Card), and payment statuses. Credit card numbers are handled exclusively by PCI-DSS Level 1 compliant payment gateways and are never stored on XYRO servers.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              2. How We Use Your Information
            </h2>
            <p>We use collected data solely for legitimate operational purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#5A4838]">
              <li>To provision, authenticate, and maintain isolated gym workspace databases.</li>
              <li>To dispatch email OTP verification codes and password reset instructions.</li>
              <li>To facilitate dynamic QR pass generation and hardware access verification.</li>
              <li>To generate GST-compliant tax invoices and member receipts.</li>
              <li>To trigger renewal notifications and member service communications.</li>
              <li>To detect and prevent fraudulent login attempts and rate-limit violations.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              3. Data Security &amp; Encryption Standards
            </h2>
            <p>
              We implement comprehensive technical and organizational measures to ensure state-of-the-art data security:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#5A4838]">
              <li>
                <strong>Encryption in Transit:</strong> All web traffic is encrypted using TLS 1.3 with HTTPS enforcement and Strict-Transport-Security (HSTS).
              </li>
              <li>
                <strong>Encryption at Rest:</strong> Database records and backups are encrypted using AES-256 standards.
              </li>
              <li>
                <strong>Credential Hashing:</strong> Passwords are irreversibly hashed using standard <code className="rounded bg-[#F3EFEA] px-1 font-mono text-xs">bcrypt</code> algorithms with cryptographic salts.
              </li>
              <li>
                <strong>Anti-Compromise Safeguards:</strong> Password creation is validated against real-time data breach archives (HaveIBeenPwned API) to block compromised passwords.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              4. Third-Party Service Providers
            </h2>
            <p>
              XYRO partners with select trusted infrastructure vendors to deliver our services:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#5A4838]">
              <li><strong>Cloud Hosting &amp; Database:</strong> AWS, Supabase, and Vercel for isolated PostgreSQL hosting and compute runtime.</li>
              <li><strong>Email Delivery:</strong> Google Cloud / Gmail SMTP for transactional OTPs and system notifications.</li>
              <li><strong>Payment Processing:</strong> Razorpay / Stripe for secure subscription checkouts.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              5. Data Retention &amp; Right to Deletion
            </h2>
            <p>
              Gym owners have full autonomy to export or delete member records. Upon account termination, facility data is securely purged from production clusters within 30 days, in accordance with applicable retention laws.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              6. Contact Data Protection Officer (DPO)
            </h2>
            <p>
              If you have any questions, data subject requests, or privacy concerns, please contact our Data Protection Officer:
            </p>
            <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 font-mono text-xs">
              <p>XYRO Fitness Technologies Inc. — Data Privacy Office</p>
              <p>Email: privacy@xyrofitness.com</p>
              <p>Security Team: security@xyrofitness.com</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
