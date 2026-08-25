import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { getGymSubscription } from "@/lib/subscriptions";
import { formatDate, daysRemaining, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AddMemberDialog } from "./members-form";
import { MemberActions } from "./member-actions";
import { ExportMembersButton } from "./export-members-button";
import { ImportMembersDialog } from "./import-members-dialog";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const [{ config }, members, plans] = await Promise.all([
    getGymSubscription(gymId),
    prisma.member.findMany({
      where: { gymId, deletedAt: null },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        memberships: {
          where: { status: "ACTIVE" },
          include: { plan: { select: { name: true } } },
          orderBy: { endDate: "desc" },
          take: 1,
        },
        assignedTrainer: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membershipPlan.findMany({
      where: { gymId, deletedAt: null, isActive: true },
      select: { id: true, name: true, price: true, durationDays: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5D9C5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#33281E]">Athlete Directory</h1>
            <Badge variant="outline" className="font-mono text-[10px] border-[#E5D9C5] bg-white text-[#8B5E34]">
              {members.length} / {config.maxMembers === 999999 ? "∞" : config.maxMembers} ({config.badge})
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-[#8C7A6B]">
            {members.length} registered athlete{members.length === 1 ? "" : "s"} across active and paused tiers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMembersButton
            data={members.map((m) => {
              const active = m.memberships[0];
              return {
                id: m.id,
                memberId: m.memberId,
                name: m.user.name,
                email: m.user.email,
                phone: m.user.phone,
                planName: active ? active.plan.name : "None",
                expiryDate: active ? formatDate(active.endDate) : "—",
                trainerName: m.assignedTrainer ? m.assignedTrainer.user.name : "None",
                status: m.isActive ? "Active" : "Inactive",
                joinDate: formatDate(m.joinDate),
              };
            })}
          />
          <ImportMembersDialog />
          <AddMemberDialog plans={plans} />
        </div>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white py-16 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)] px-4">
          <p className="font-display text-base font-bold text-[#33281E]">No athletes enrolled yet</p>
          <p className="max-w-sm text-xs text-[#8C7A6B]">
            Import your existing members from Excel or enroll your first member to assign a dynamic QR pass.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <ImportMembersDialog />
            <AddMemberDialog plans={plans} />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5D9C5] bg-[#F9F8F6]">
                  <th className="h-10 px-4 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Athlete</th>
                  <th className="h-10 px-3 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Member ID</th>
                  <th className="h-10 px-3 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Contact</th>
                  <th className="h-10 px-3 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Active Plan</th>
                  <th className="h-10 px-3 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Validity</th>
                  <th className="h-10 px-3 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Coach</th>
                  <th className="h-10 px-3 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Status</th>
                  <th className="h-10 px-4 text-right font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D9C5]">
                {members.map((m) => {
                  const active = m.memberships[0];
                  const days = active ? daysRemaining(active.endDate) : 0;
                  return (
                    <tr key={m.id} className="transition-colors hover:bg-[#FAF9F7]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#8B5E34] text-[11px] font-bold text-white shadow-xs">
                            {getInitials(m.user.name)}
                          </div>
                          <div>
                            <p className="font-bold text-[#33281E]">{m.user.name}</p>
                            <p className="font-mono text-[10px] text-[#8C7A6B]">Joined {formatDate(m.joinDate)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-[#8B5E34]">{m.memberId}</td>
                      <td className="px-3 py-3 text-[11px]">
                        <p className="text-[#33281E]">{m.user.email}</p>
                        <p className="font-mono text-[10px] text-[#8C7A6B]">{m.user.phone || "—"}</p>
                      </td>
                      <td className="px-3 py-3">
                        {active ? (
                          <Badge variant="outline" className="font-mono font-bold text-[#8B5E34]">
                            {active.plan.name}
                          </Badge>
                        ) : (
                          <span className="text-[#8C7A6B] text-[11px]">No active plan</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[11px]">
                        {active ? (
                          <div>
                            <p className="font-mono font-semibold text-[#33281E]">{formatDate(active.endDate)}</p>
                            <p className={`font-mono text-[10px] ${days <= 7 ? "text-red-600 font-bold" : "text-[#8C7A6B]"}`}>
                              {days > 0 ? `${days}d remaining` : "Expired"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#8C7A6B]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-[#8C7A6B]">
                        {m.assignedTrainer ? m.assignedTrainer.user.name : <span className="text-gray-400">Unassigned</span>}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={m.isActive ? "success" : "destructive"}>
                          {m.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MemberActions
                          memberId={m.id}
                          memberName={m.user.name}
                          isActive={m.isActive}
                          plans={plans}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
