import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { getGymSubscription } from "@/lib/subscriptions";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AddTrainerDialog } from "./trainers-form";
import { TrainerActions, GymMemberSummary } from "./trainer-actions";

export const metadata = { title: "Trainers" };

export default async function TrainersPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const [{ config }, trainers, rawMembers] = await Promise.all([
    getGymSubscription(gymId),
    prisma.trainer.findMany({
      where: { gymId, deletedAt: null },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.findMany({
      where: { gymId, deletedAt: null },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        assignedTrainer: {
          include: {
            user: { select: { name: true } },
          },
        },
        memberships: {
          where: { status: "ACTIVE" },
          include: { plan: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const allMembers: GymMemberSummary[] = rawMembers.map((m) => ({
    id: m.id,
    memberId: m.memberId,
    name: m.user?.name || "Member",
    email: m.user?.email || "—",
    phone: m.user?.phone || null,
    assignedTrainerId: m.trainerId,
    assignedTrainerName: m.assignedTrainer?.user?.name || null,
    planName: m.memberships[0]?.plan?.name || null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5D9C5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-[#33281E] tracking-tight">
              Coaching Staff &amp; Trainers
            </h1>
            <Badge variant="outline" className="font-mono text-[10px] border-[#E5D9C5] bg-white text-[#8B5E34]">
              {trainers.length} / {config.maxTrainers === 999999 ? "∞" : config.maxTrainers} ({config.badge})
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#8C7A6B]">
            {trainers.length} certified coach{trainers.length === 1 ? "" : "es"} assigned across strength and conditioning
          </p>
        </div>
        <AddTrainerDialog />
      </div>

      {trainers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white py-20 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <p className="font-display text-base font-bold text-[#33281E]">No coaches registered yet</p>
          <p className="max-w-sm text-xs text-[#8C7A6B]">
            Onboard your coaching staff to assign personal training athletes, progressive overload logs, and diet regimes.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trainers.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition-all duration-300 hover:border-[#8B5E34] hover:shadow-[0_8px_24px_rgba(51,40,30,0.08)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B5E34] text-sm font-bold text-white shadow-xs">
                  {getInitials(t.user?.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-bold text-[#33281E]">
                    {t.user?.name || "Trainer"}
                  </h3>
                  <p className="truncate text-xs text-[#8C7A6B]">{t.user?.email || "—"}</p>
                </div>
                <Badge
                  variant={t.isActive ? "success" : "secondary"}
                  className="ml-auto shrink-0 font-mono text-[10px]"
                >
                  {t.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {t.specialization && (
                  <Badge variant="default" className="font-mono text-[10px]">
                    {t.specialization}
                  </Badge>
                )}
                {t.experience && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {t.experience}
                  </Badge>
                )}
                <Badge variant="info" className="font-mono text-[10px]">
                  {t._count.members} athlete{t._count.members === 1 ? "" : "s"}
                </Badge>
              </div>

              {t.bio && (
                <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-[#8C7A6B]">
                  {t.bio}
                </p>
              )}

              <TrainerActions
                trainerId={t.id}
                trainerName={t.user.name}
                isActive={t.isActive}
                memberCount={t._count.members}
                allMembers={allMembers}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
