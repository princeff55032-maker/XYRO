import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { LeadsClient } from "./leads-client";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  let gym: any = null;
  let leads: any[] = [];
  let plans: any[] = [];

  try {
    const results = await Promise.all([
      prisma.gym.findUnique({
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
    gym = results[0];
    leads = results[1];
    plans = results[2];
  } catch (err) {
    console.error("[LeadsPage Fetch Error]:", err);
  }

  const gymCode = gym?.gymCode || session.user.gymCode || "XYRO-001";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#33281E]">Leads</h1>
        <p className="mt-1.5 text-sm text-[#8C7A6B]">
          Track prospective gym visitors, trial bookings, and convert inquiries into paying members.
        </p>
      </div>

      <LeadsClient leads={leads} plans={plans} gymCode={gymCode} />
    </div>
  );
}
