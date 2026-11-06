import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { LeadsClient } from "./leads-client";
import type { Prisma } from "@prisma/client";

type LeadRow = Prisma.LeadGetPayload<Prisma.LeadDefaultArgs>;
type PlanRow = Prisma.MembershipPlanGetPayload<{ select: { id: true; name: true } }>;

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  let leads: LeadRow[] = [];
  let plans: PlanRow[] = [];

  try {
    const results = await Promise.all([
      prisma.lead.findMany({
        where: { gymId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.membershipPlan.findMany({
        where: { gymId, deletedAt: null, isActive: true },
        select: { id: true, name: true },
      }),
    ]);
    leads = results[0];
    plans = results[1];
  } catch (err) {
    console.error("[LeadsPage Fetch Error]:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#33281E]">Leads</h1>
        <p className="mt-1.5 text-sm text-[#8C7A6B]">
          Track prospective gym visitors, trial bookings, and convert inquiries into paying members.
        </p>
      </div>

      <LeadsClient leads={leads} plans={plans} />
    </div>
  );
}
