import {
  Users,
  CreditCard,
  ScanLine,
  Dumbbell,
  Salad,
  BellRing,
  BarChart3,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

const capabilities = [
  {
    icon: CreditCard,
    tag: "FINANCIAL AUTOMATION",
    title: "GST Invoicing & Dynamic UPI Reconciliations",
    desc: "Generate tax-compliant PDF invoices with dynamic UPI QR codes. Receipts auto-dispatch to WhatsApp and mark accounts as active the moment funds clear.",
    accent: "#8B5E34",
  },
  {
    icon: BellRing,
    tag: "RETENTION ENGINE",
    title: "Automated Renewal Radar (7D & 24H)",
    desc: "Proactively engage members nearing renewal dates with automated WhatsApp sequences, eliminating manual receptionist phone calls and recovering recurring revenue.",
    accent: "#8B5E34",
  },
  {
    icon: Dumbbell,
    tag: "STRENGTH PROGRAMMING",
    title: "RPE Logs & Progressive Overload",
    desc: "Equip your trainers to build structured periodized routines. Members track weight lifted, RPE intensity, and volume progression directly in their portal.",
    accent: "#8B5E34",
  },
  {
    icon: Salad,
    tag: "NUTRITIONAL PROTOCOLS",
    title: "Caloric & Macronutrient Engines",
    desc: "Prescribe individualized macronutrient targets (protein, carbohydrates, fats) with hydration schedules, meal timing reminders, and allergy exclusions.",
    accent: "#8B5E34",
  },
  {
    icon: CalendarDays,
    tag: "STUDIO TIMETABLES",
    title: "Class Rosters & Capacity Capping",
    desc: "Eliminate crowded studios. Publish scheduled HIIT, Yoga, and Spin classes with hard capacity caps, member self-booking, and automated waitlist bumps.",
    accent: "#8B5E34",
  },
  {
    icon: ShieldCheck,
    tag: "SECURITY ARCHITECTURE",
    title: "Isolated Cryptographic Tenancy",
    desc: "Every gym operates on a dedicated logical boundary. Your gym financials, client contacts, and staff records remain completely inaccessible to any outside party.",
    accent: "#8B5E34",
  },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-24 md:py-32">
      {/* Section Header with Fluid Typography */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#8B5E34] uppercase">
          THE FACILITY OPERATING SUITE
        </span>
        <h2 className="mt-4 font-display font-bold text-[#33281E] text-fluid-headline">
          Engineered for High-Performance Gyms.{" "}
          <span className="text-[#8B5E34]">Nothing Generic.</span>
        </h2>
        <p className="mt-5 text-fluid-body leading-relaxed text-[#8C7A6B]">
          Replace fragmented spreadsheets, paper logs, and manual messaging with a unified operating system built specifically for boutique health gyms, box gyms, and personal training studios.
        </p>
      </div>

      {/* Asymmetrical 6-Pillar Editorial Grid */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((c) => (
          <div
            key={c.title}
            className="group relative flex flex-col justify-between rounded-3xl border border-[#E5D9C5] bg-white p-7 shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition-all duration-300 ease-in-out hover:-translate-y-1.5 hover:border-[#8B5E34] hover:shadow-[0_12px_32px_rgba(51,40,30,0.08)]"
          >
            <div>
              <div className="flex items-center justify-between">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] text-[#8B5E34]"
                >
                  <c.icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] font-bold tracking-widest text-[#8C7A6B] uppercase">
                  {c.tag}
                </span>
              </div>

              <h3 className="mt-6 font-display text-lg font-bold text-[#33281E] leading-snug group-hover:text-[#8B5E34] transition-colors">
                {c.title}
              </h3>
              <p className="mt-3 text-xs md:text-sm leading-relaxed text-[#8C7A6B]">
                {c.desc}
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-[#8B5E34] pt-4 border-t border-[#E5D9C5] opacity-80 group-hover:opacity-100 transition-opacity">
              <span>Explore Capability</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
