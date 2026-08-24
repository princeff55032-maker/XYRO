"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Activity, IndianRupee, Users, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { CountUp } from "./count-up";

const keyMetrics = [
  {
    label: "ACTIVE ATHLETES",
    value: 1284,
    prefix: "",
    suffix: "",
    subtext: "Verified gym roster",
    icon: Users,
  },
  {
    label: "TURNSTILE RELAY",
    value: 180,
    prefix: "< ",
    suffix: "ms",
    subtext: "Biometric & dynamic QR",
    icon: Activity,
  },
  {
    label: "UPTIME SLA",
    value: 99.98,
    prefix: "",
    suffix: "%",
    subtext: "Multi-tenant cloud sync",
    icon: ShieldCheck,
  },
];

export function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[85svh] bg-[#F9F8F6] pt-36 pb-24 md:pt-48 md:pb-36 overflow-hidden flex flex-col justify-center"
    >
      <div className="mx-auto max-w-5xl px-6 text-center">
        {/* Large Editorial Headline with CSS clamp() */}
        <h1
          className="font-display font-extrabold tracking-tight text-[#33281E] leading-[1.06]"
          style={{
            fontSize: "clamp(2.75rem, 5.5vw + 1rem, 5.5rem)",
          }}
        >
          Run Your Gym With{" "}
          <span className="text-[#8B5E34]">Institutional Precision.</span>
        </h1>

        {/* Bespoke Realistic Copywriting */}
        <p className="mx-auto mt-7 max-w-2xl text-fluid-body leading-relaxed text-[#8C7A6B]">
          Unify sub-second biometric turnstiles, automated WhatsApp renewal sequences, GST-compliant invoicing, and individualized strength programming in a bespoke, tranquil management console.
        </p>

        {/* Micro-Interaction CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="btn-primary inline-flex h-13 items-center justify-center gap-2.5 rounded-full px-8 text-xs font-bold tracking-wider text-white uppercase transition-all duration-300 shadow-[0_4px_18px_rgba(139,94,52,0.22)] hover:shadow-[0_8px_26px_rgba(139,94,52,0.32)] hover:-translate-y-0.5"
          >
            <span>Start Your Gym</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="btn-ghost inline-flex h-13 items-center justify-center gap-2 rounded-full px-8 text-xs font-bold tracking-wider text-[#33281E] uppercase transition-all duration-300 hover:-translate-y-0.5"
          >
            Explore Floor Operations
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-xs text-[#8C7A6B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#8B5E34]" />
            <span className="font-medium">Sub-200ms Turnstile Latency</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#8B5E34]" />
            <span className="font-medium">Encrypted Multi-Tenant Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#8B5E34]" />
            <span className="font-medium">Instant 5-Minute Deployment</span>
          </div>
        </div>

        {/* Clean Horizontal Key Metrics Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 border-t border-[#E5D9C5]/80">
          {keyMetrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)] text-left hover:border-[#8B5E34] transition-colors"
            >
              <div className="flex items-center gap-2 text-[#8B5E34]">
                <m.icon className="h-4 w-4" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">
                  {m.label}
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-[#33281E]">
                <CountUp value={m.value} prefix={m.prefix} suffix={m.suffix} />
              </div>
              <p className="mt-1 text-[11px] text-[#8C7A6B]">{m.subtext}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
