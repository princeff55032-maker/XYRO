"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, QrCode, CreditCard, BellRing, CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";

const keyOutcomes = [
  {
    label: "DYNAMIC QR ACCESS",
    title: "5-Second Check-in",
    subtext: "Touchless rotating QR passes with turnstile & biometric gate sync.",
    icon: QrCode,
  },
  {
    label: "ZERO SPREADSHEETS",
    title: "Instant Inflows",
    subtext: "Track Cash, UPI, Cards, and online payments with GST invoice receipts.",
    icon: CreditCard,
  },
  {
    label: "AUTO-FOLLOWUPS",
    title: "Zero Lapsed Dues",
    subtext: "Automated WhatsApp sequences nudge members 7d, 3d, and 1d before expiry.",
    icon: BellRing,
  },
];

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[85svh] bg-[#F9F8F6] pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden flex flex-col justify-center"
    >
      <div className="mx-auto max-w-5xl px-6 text-center">
        {/* Large Editorial Headline with CSS clamp() */}
        <h1
          className="font-display font-extrabold tracking-tight text-[#33281E] leading-[1.06]"
          style={{
            fontSize: "clamp(2.5rem, 5vw + 1rem, 5.25rem)",
          }}
        >
          Run Your Entire Gym{" "}
          <span className="text-[#8B5E34]">From Your System.</span>
        </h1>

        {/* Outcome-oriented copywriting */}
        <p className="mx-auto mt-6 max-w-2xl text-fluid-body leading-relaxed text-[#8C7A6B]">
          Know exactly who walked into your gym with short-lived dynamic QR passes, collect member payments without messy spreadsheets, and automatically retain expiring athletes via WhatsApp.
        </p>

        {/* Action CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="btn-primary inline-flex h-13 items-center justify-center gap-2.5 rounded-full px-8 text-xs font-bold tracking-wider text-white uppercase transition-all duration-300 shadow-[0_4px_18px_rgba(139,94,52,0.22)] hover:shadow-[0_8px_26px_rgba(139,94,52,0.32)] hover:-translate-y-0.5"
          >
            <span>Start Free Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="btn-ghost inline-flex h-13 items-center justify-center gap-2 rounded-full px-8 text-xs font-bold tracking-wider text-[#33281E] uppercase transition-all duration-300 hover:-translate-y-0.5"
          >
            See Live Features
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-6 text-xs text-[#8C7A6B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#8B5E34]" />
            <span className="font-medium">Up to 50 Athletes Free Forever</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[#8B5E34]" />
            <span className="font-medium">Mobile-First Owner App</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#8B5E34]" />
            <span className="font-medium">Encrypted &amp; Audit-Logged</span>
          </div>
        </div>

        {/* 3 Outcome Feature Cards */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 border-t border-[#E5D9C5]/80">
          {keyOutcomes.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="rounded-2xl border border-[#E5D9C5] bg-white p-5 text-left shadow-[0_4px_20px_rgba(51,40,30,0.03)] hover:border-[#8B5E34] transition-colors"
              >
                <div className="flex items-center justify-between text-[#8B5E34]">
                  <Icon className="h-5 w-5" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">
                    {m.label}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-[#33281E]">
                  {m.title}
                </h3>
                <p className="mt-1 text-xs text-[#8C7A6B] leading-relaxed">
                  {m.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
