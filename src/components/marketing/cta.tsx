import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function CTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-[#E5D9C5] bg-white px-8 py-16 text-center md:py-24 shadow-[0_12px_40px_rgba(51,40,30,0.05)]">
        <div className="relative">
          <h2 className="mx-auto max-w-3xl font-display font-bold text-[#33281E] text-fluid-headline">
            Elevate Your Fitness Facility to{" "}
            <span className="text-[#8B5E34]">Institutional Standards.</span>
          </h2>
          
          <p className="mx-auto mt-5 max-w-2xl text-fluid-body leading-relaxed text-[#8C7A6B]">
            Unify turnstiles, automated WhatsApp renewal sequences, and member strength programming. Set up your dedicated gym workspace in minutes with zero disruption to daily floor operations.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="btn-primary inline-flex h-12 items-center justify-center gap-2.5 rounded-full px-8 text-xs font-semibold uppercase tracking-wider text-white transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_18px_rgba(139,94,52,0.25)] cursor-pointer"
            >
              <span>Start Your Gym</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="btn-ghost inline-flex h-12 items-center justify-center rounded-full px-8 text-xs font-semibold uppercase tracking-wider text-[#33281E] transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Sign In to Existing Portal
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#8C7A6B]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#8B5E34]" />
              <span>Zero setup fees</span>
            </div>
            <span>·</span>
            <div>No credit card required</div>
            <span>·</span>
            <div>Instant isolated database provisioning</div>
            <span>·</span>
            <div>Full CSV &amp; PDF ledger export anytime</div>
          </div>
        </div>
      </div>
    </section>
  );
}
