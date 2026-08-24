import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { LeadsClient } from "./leads-client";

export const metadata = { title: "Leads CRM" };

export default async function LeadsPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const [gym, leads, plans] = await Promise.all([
    prisma.gym.findUniqueOrThrow({
      where: { id: gymId },
      select: { gymCode: true, name: true },
    }),
    prisma.lead.findMany({
      where: { gymId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membershipPlan.findMany({
      where: { gymId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#33281E]">Inbound Leads &amp; Sales CRM</h1>
        <p className="mt-1.5 text-sm text-[#8C7A6B]">
          Track prospective gym visitors, trial bookings, and convert inquiries into paying members.
        </p>
      </div>

      <LeadsClient leads={leads} plans={plans} gymCode={gym.gymCode} />
    </div>
  );
}
