import Link from "next/link";
import { Logo } from "./logo";
import { ShieldCheck, Activity } from "lucide-react";

const columns = [
  {
    title: "Facility Operations",
    links: [
      { label: "Turnstile Biometrics", href: "#features" },
      { label: "GST & UPI Invoicing", href: "#features" },
      { label: "Live Floor Occupancy", href: "#features" },
      { label: "Studio Class Timetables", href: "#features" },
      { label: "7-Day Renewal Radar", href: "#features" },
    ],
  },
  {
    title: "Studio Types",
    links: [
      { label: "Boutique Strength Studios", href: "#pricing" },
      { label: "CrossFit & HIIT Boxes", href: "#pricing" },
      { label: "Personal Training Academies", href: "#pricing" },
      { label: "Multi-City Gym Franchises", href: "#pricing" },
    ],
  },
  {
    title: "Platform & Security",
    links: [
      { label: "Multi-Tenant Architecture", href: "#platform" },
      { label: "Turnstile Hardware API", href: "#platform" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[#E5D9C5] bg-[#F3EFEA]">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-xs md:text-sm leading-relaxed text-[#8C7A6B]">
              The high-performance operating system for modern health gyms and fitness studios. Engineered with zero compromise.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-800 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>All Systems Operational (99.98% SLA)</span>
            </div>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <h4 className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#33281E] uppercase">
                {c.title}
              </h4>
              <ul className="mt-5 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-xs text-[#8C7A6B] transition-colors duration-200 hover:text-[#8B5E34]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[#E5D9C5] pt-8 sm:flex-row">
          <p className="text-xs text-[#8C7A6B]">
            © {new Date().getFullYear()} XYRO Fitness Technologies Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-xs text-[#8C7A6B]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#8B5E34]" />
              <span>SOC-2 Type II Certified Host</span>
            </span>
            <span>·</span>
            <span>ISO 27001 Tenancy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
