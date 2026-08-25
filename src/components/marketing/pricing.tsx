import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Studio Sandbox",
    price: "₹0",
    period: "/forever",
    badge: "BOOTSTRAP",
    tagline: "For private trainers & emerging personal studios.",
    features: [
      "Up to 50 active athletes",
      "Digital QR passport generation",
      "Manual front-desk check-in logs",
      "Cash & manual payment ledger",
      "Standard client profiles",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Single Facility (Starter)",
    price: "₹1,499",
    period: "/month",
    badge: "ESTABLISHED",
    tagline: "For independent fitness gyms and strength boxes.",
    features: [
      "Up to 300 active athletes",
      "Dynamic sub-second QR check-in",
      "Automated GST invoicing & UPI links",
      "7-Day renewal radar over WhatsApp",
      "Real-time floor occupancy gauge",
      "Cash flow & revenue charts",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Performance Gym (Pro)",
    price: "₹3,499",
    period: "/month",
    badge: "MOST POPULAR FOR GYMS",
    tagline: "For high-volume gyms with trainers and group classes.",
    features: [
      "Unlimited active athlete roster",
      "Trainer commission & payout ledger",
      "RPE strength & nutrition builder",
      "Gym class scheduling & waitlisting",
      "Multi-stage automated WhatsApp nudges",
      "Cohort churn & retention analytics",
      "Staff RBAC (Admins, Trainers, Reception)",
    ],
    cta: "Get Started",
    featured: true,
  },
  {
    name: "Enterprise Chain (Business)",
    price: "₹7,999",
    period: "/month",
    badge: "MULTI-LOCATION",
    tagline: "For multi-branch gym franchises and health networks.",
    features: [
      "Everything in Performance Gym",
      "Multi-branch consolidated ledger",
      "Cross-facility athlete roaming check-in",
      "Turnstile relay hardware API & webhooks",
      "Dedicated facility onboarding lead",
      "Priority SLA phone & WhatsApp support",
    ],
    cta: "Get Started",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative mx-auto max-w-7xl scroll-mt-24 px-6 py-24 md:py-32">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#8B5E34] uppercase">
          COMMERCIAL RATE CARDS
        </span>
        <h2 className="mt-4 font-display font-bold text-[#33281E] text-fluid-headline">
          Transparent Investment.{" "}
          <span className="text-[#8B5E34]">Zero Hidden Markups.</span>
        </h2>
        <p className="mt-5 text-fluid-body leading-relaxed text-[#8C7A6B]">
          Scale effortlessly from a single boutique studio to a multi-city franchise. All plans include automated daily cloud backups and zero per-transaction gateway cuts.
        </p>
      </div>

      {/* Asymmetric 4-Tier Pricing Grid */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {plans.map((p) => (
          <div
            key={p.name}
            className={cn(
              "relative flex flex-col justify-between rounded-3xl p-7 transition-all duration-300 ease-in-out bg-white",
              p.featured
                ? "border-2 border-[#8B5E34] shadow-[0_16px_40px_rgba(51,40,30,0.08)] lg:-translate-y-3"
                : "border border-[#E5D9C5] shadow-[0_4px_20px_rgba(51,40,30,0.03)] hover:-translate-y-1.5 hover:border-[#8B5E34] hover:shadow-[0_10px_30px_rgba(51,40,30,0.06)]"
            )}
          >
            {/* Overlapping Feature Badge */}
            {p.featured && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#8B5E34] px-4 py-1 text-[10px] font-bold tracking-wider text-white shadow-sm uppercase font-mono">
                {p.badge}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#33281E]">{p.name}</h3>
                {!p.featured && (
                  <span className="text-[10px] font-mono font-semibold tracking-wider text-[#8C7A6B] uppercase">
                    {p.badge}
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs leading-relaxed text-[#8C7A6B]">{p.tagline}</p>

              <div className="mt-6 flex items-baseline gap-1 border-y border-[#E5D9C5] py-4">
                <span className="font-display text-4xl font-bold text-[#33281E] tracking-tight">{p.price}</span>
                <span className="text-xs text-[#8C7A6B]">{p.period}</span>
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-[#33281E] leading-snug">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F9F8F6] border border-[#E5D9C5] text-[#8B5E34]">
                      <Check className="h-2.5 w-2.5 text-[#8B5E34]" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/register"
              className={cn(
                "mt-8 inline-flex h-11 items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
                p.featured
                  ? "btn-primary shadow-[0_4px_18px_rgba(139,94,52,0.25)]"
                  : "btn-ghost"
              )}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Trust & Guarantee Note */}
      <div className="mt-12 text-center text-xs text-[#8C7A6B]">
        <p>
          Need custom enterprise hardware integrations? All plans include a 14-day zero-risk trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
