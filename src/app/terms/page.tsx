import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Terms of Service — XYRO Gym Management Platform",
  description:
    "Institutional terms of service, acceptable use policy, and subscription agreements for gym owners, administrators, and fitness facilities using XYRO.",
};

export default function TermsPage() {
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
          <FileText className="h-3.5 w-3.5" />
          <span>Legal &amp; Compliance</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold text-[#33281E] md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-[#8C7A6B]">
          Effective Date: {lastUpdated} · Version 2.4
        </p>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-8 md:p-14 shadow-[0_12px_40px_rgba(51,40,30,0.04)] space-y-10 text-sm leading-relaxed text-[#33281E]">
          {/* Notice Box */}
          <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-6 text-xs text-[#8C7A6B]">
            <p className="font-semibold text-[#33281E] mb-1">Summary for Gym Owners &amp; Operators:</p>
            These Terms of Service govern your access to and use of the XYRO platform, including workspace management, biometric/QR check-in APIs, GST invoicing tools, and member engagement features. By provisioning a workspace or logging into XYRO, you agree to be bound by these Terms.
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              1. Acceptance of Terms &amp; Account Provisioning
            </h2>
            <p>
              By registering an account, provisioning a gym workspace, or utilizing any services provided by XYRO Fitness Technologies Inc. (&quot;XYRO&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you (&quot;Facility Owner&quot;, &quot;Admin&quot;, or &quot;User&quot;) agree to comply with and be legally bound by these Terms of Service.
            </p>
            <p>
              You represent and warrant that you are at least 18 years of age and possess full legal authority to bind the commercial entity, health club, gym, or fitness academy you represent.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              2. Subscription Plans &amp; Billing
            </h2>
            <p>
              XYRO offers multi-tiered subscription plans (including Free Sandbox, Starter, Pro, and Enterprise tiers). Subscriptions renew automatically on a monthly or annual billing cycle unless cancelled prior to the renewal date.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#5A4838]">
              <li>
                <strong>Free Sandbox:</strong> Complimentary tier allowing up to 50 active athletes with standard ledger capabilities.
              </li>
              <li>
                <strong>Paid Tiers (Starter, Pro, Enterprise):</strong> Fees are billed in Indian Rupees (INR) plus applicable GST (18%). Payments are processed securely via verified gateways.
              </li>
              <li>
                <strong>Quota Enforcement:</strong> If member or coach thresholds exceed plan limits, workspace access to add new members may be throttled until an upgrade is selected.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              3. Data Ownership &amp; Multi-Tenant Isolation
            </h2>
            <p>
              You retain all ownership rights, title, and intellectual property in and to your facility data, including member rosters, trainer records, payment histories, workout routines, and attendance telemetry.
            </p>
            <p>
              XYRO processes your data strictly inside isolated multi-tenant boundaries. We will never sell, rent, or monetize your member contact lists or operational records to third-party advertisers or competitors.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              4. Hardware Integrations, QR Tokens &amp; Turnstiles
            </h2>
            <p>
              XYRO provides access verification endpoints (<code className="rounded bg-[#F3EFEA] px-1.5 py-0.5 font-mono text-xs text-[#8B5E34]">/api/access/verify</code>) and dynamic anti-screenshot QR tokens for access control.
            </p>
            <p>
              You are responsible for the physical installation, wiring, internet reliability, and maintenance of third-party turnstile relays, cameras, and barcode hardware deployed at your facility. XYRO is not liable for access disruptions caused by local hardware faults or internet outages.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              5. Role-Based Access Control (RBAC) &amp; Security
            </h2>
            <p>
              Facility Administrators are responsible for managing staff roles (Gym Admins, Trainers, Receptionists) and maintaining the confidentiality of their credentials. You must immediately notify XYRO of any unauthorized access or security breaches.
            </p>
            <p>
              Users must adhere to password complexity standards (minimum 12 characters with uppercase, lowercase, numbers, and symbols) and utilize email OTP verification.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              6. Acceptable Use Policy
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#5A4838]">
              <li>Use XYRO for any unlawful purpose, fraud, or unsolicited bulk messaging (spam).</li>
              <li>Reverse engineer, decompile, or attempt to extract source code from the platform.</li>
              <li>Probe, scan, or test the vulnerability of our APIs or infrastructure without explicit authorization.</li>
              <li>Upload malicious code, viruses, or disruptive scripts.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              7. Service Availability &amp; SLA
            </h2>
            <p>
              We strive to maintain high system availability with automated database replication and serverless architectures. Scheduled maintenance will be communicated in advance whenever feasible.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              8. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, XYRO and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business goodwill.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[#33281E] border-b border-[#E5D9C5] pb-2">
              9. Contact &amp; Legal Inquiries
            </h2>
            <p>
              For legal questions regarding these Terms of Service, please contact our legal counsel at:
            </p>
            <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 font-mono text-xs">
              <p>XYRO Fitness Technologies Inc.</p>
              <p>Email: legal@xyrofitness.com</p>
              <p>Support: support@xyrofitness.com</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
