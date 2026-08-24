import { ArrowRight, ShieldCheck, Database, Layers, CheckCircle2 } from "lucide-react";

const steps = [
  {
    num: "01",
    tag: "CONFIGURATION",
    title: "Architect Rate Cards & Staff Roles",
    desc: "Set up multi-tier memberships, personal training packages, GST parameters, and role-based permissions (Admins, Receptionists, Trainers) in under 5 minutes.",
  },
  {
    num: "02",
    tag: "DISTRIBUTION",
    title: "Deploy Digital QR Passports",
    desc: "Generate branded Apple/Google Wallet compatible digital passes. Members receive instant credentials over WhatsApp with dynamic anti-screenshot protection.",
  },
  {
    num: "03",
    tag: "AUTOMATION",
    title: "Automate Floor Ops & Collections",
    desc: "Monitor live check-in telemetry, automate 7-day renewal reminder sequences, and generate GST-reconciled monthly cash flow reports with zero manual overhead.",
  },
];

export function Platform() {
  return (
    <section id="platform" className="relative scroll-mt-24 overflow-hidden py-24 md:py-32">
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#8B5E34] uppercase">
            OPERATIONAL DEPLOYMENT
          </span>
          <h2 className="mt-4 font-display font-bold text-[#33281E] text-fluid-headline">
            From Registration to Floor Live —{" "}
            <span className="text-[#8B5E34]">In One Afternoon.</span>
          </h2>
          <p className="mt-5 text-fluid-body leading-relaxed text-[#8C7A6B]">
            Engineered for rapid onboarding. Zero complex server setup, zero hardware lock-in, and immediate day-one turnstile connectivity.
          </p>
        </div>

        {/* Asymmetrical 3-Step Grid with Overlapping Badges */}
        <div className="mt-16 grid gap-7 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              {i < steps.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 z-20 hidden h-5 w-5 -translate-y-1/2 text-[#8B5E34]/40 lg:block" />
              )}
              <div className="group relative flex h-full flex-col justify-between rounded-3xl border border-[#E5D9C5] bg-white p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition-all duration-300 ease-in-out hover:-translate-y-1.5 hover:border-[#8B5E34] hover:shadow-[0_12px_32px_rgba(51,40,30,0.08)]">
                {/* Overlapping Step Number */}
                <div className="flex items-center justify-between">
                  <span className="font-display text-5xl font-extrabold text-[#8B5E34]/30 group-hover:text-[#8B5E34] transition-colors">
                    {s.num}
                  </span>
                  <span className="rounded-full bg-[#F9F8F6] border border-[#E5D9C5] px-3 py-1 text-[10px] font-bold tracking-widest text-[#8C7A6B] uppercase font-mono">
                    {s.tag}
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="font-display text-xl font-bold text-[#33281E] group-hover:text-[#8B5E34] transition-colors">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-xs md:text-sm leading-relaxed text-[#8C7A6B]">
                    {s.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5D9C5] flex items-center gap-2 text-xs text-[#8C7A6B]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#8B5E34] shrink-0" />
                  <span>Immediate cloud sync</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
