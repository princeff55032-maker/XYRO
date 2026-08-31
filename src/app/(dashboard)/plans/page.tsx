import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AddPlanDialog } from "./plans-form";
import { DeactivatePlanButton } from "./deactivate-plan";

export const metadata = { title: "Membership Plans" };

export default async function PlansPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  let plans: any[] = [];
  try {
    plans = await prisma.membershipPlan.findMany({
      where: { gymId, deletedAt: null },
      include: { _count: { select: { memberships: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  } catch (err) {
    console.error("[PlansPage Fetch Error]:", err);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5D9C5] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#33281E] tracking-tight">Membership Plans &amp; Commercial Tiers</h1>
          <p className="mt-1 text-xs text-[#8C7A6B]">
            {plans.length} configured tier{plans.length === 1 ? "" : "s"} with automated WhatsApp renewal sequences
          </p>
        </div>
        <AddPlanDialog />
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white py-20 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <p className="font-display text-base font-bold text-[#33281E]">No membership plans authored yet</p>
          <p className="max-w-sm text-xs text-[#8C7A6B]">
            Create your first membership tier — monthly, quarterly, annual, with class and personal training bundles.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="flex flex-col rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition-all duration-300 hover:border-[#8B5E34] hover:shadow-[0_8px_24px_rgba(51,40,30,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold text-[#33281E]">{p.name}</h3>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#8B5E34]">
                    {formatCurrency(p.price)}
                    <span className="ml-1 text-xs font-mono font-medium text-[#8C7A6B]">
                      / {p.durationDays}d
                    </span>
                  </p>
                </div>
                <Badge variant={p.isActive ? "success" : "secondary"} className="font-mono text-[10px]">
                  {p.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {p.description && (
                <p className="mt-3 text-xs leading-relaxed text-[#8C7A6B]">{p.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {p.classesIncluded && <Badge variant="info" className="font-mono text-[10px]">Classes</Badge>}
                {p.personalTraining && <Badge variant="warning" className="font-mono text-[10px]">PT Included</Badge>}
                {(p.freezeDays || 0) > 0 && <Badge variant="secondary" className="font-mono text-[10px]">{p.freezeDays}d freeze</Badge>}
                <Badge variant="secondary" className="font-mono text-[10px]">{p._count?.memberships || 0} active</Badge>
              </div>

              {p.features && p.features.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-xs text-[#33281E]">
                  {(p.features || []).slice(0, 4).map((f: string) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8B5E34]" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex-1" />
              <DeactivatePlanButton id={p.id} disabled={(p._count?.memberships || 0) > 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
