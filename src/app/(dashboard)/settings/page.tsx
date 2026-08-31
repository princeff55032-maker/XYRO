import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { SettingsClient } from "./settings-client";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  let gym: any = null;
  let staff: any[] = [];
  let totalMembers = 0;
  let totalTrainers = 0;
  let totalPlans = 0;
  let auditLogs: any[] = [];

  try {
    const results = await Promise.all([
      prisma.gym.findUnique({
        where: { id: gymId },
        include: {
          settings: true,
          subscription: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.gymStaff.findMany({
        where: { gymId, deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.member.count({
        where: { gymId, deletedAt: null },
      }),
      prisma.trainer.count({
        where: { gymId, deletedAt: null },
      }),
      prisma.membershipPlan.count({
        where: { gymId, deletedAt: null },
      }),
      prisma.auditLog.findMany({
        where: { gymId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    gym = results[0];
    staff = results[1];
    totalMembers = results[2];
    totalTrainers = results[3];
    totalPlans = results[4];
    auditLogs = results[5];
  } catch (err) {
    console.error("[SettingsPage Fetch Error]:", err);
  }

  if (!gym) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white py-20 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
        <p className="font-display text-lg font-bold text-[#33281E]">
          Workspace not found
        </p>
        <p className="max-w-sm text-xs text-[#8C7A6B]">
          Your current gym profile could not be retrieved. Please try logging in again.
        </p>
      </div>
    );
  }

  return (
    <SettingsClient
      gym={gym}
      settings={gym.settings}
      subscription={gym.subscription}
      staff={staff}
      auditLogs={auditLogs}
      stats={{
        totalMembers,
        totalTrainers,
        totalPlans,
      }}
    />
  );
}
