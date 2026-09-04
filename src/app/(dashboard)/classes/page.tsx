import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { getGymSubscription } from "@/lib/subscriptions";
import { PlanUpgradeGate } from "@/components/dashboard/plan-upgrade-gate";
import { ClassesClient } from "./classes-client";

export const metadata = { title: "Classes & Schedule" };

export default async function ClassesPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const { config } = await getGymSubscription(gymId);

  // Feature gate check for Group Classes (Requires Pro / Business tier)
  if (!config.features.group_classes) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#33281E]">Group Classes &amp; Timetables</h1>
          <p className="mt-1.5 text-sm text-[#8C7A6B]">
            Publish class rosters, timetable slots, coach assignments, and athlete bookings.
          </p>
        </div>

        <PlanUpgradeGate
          featureName="Group Classes &amp; Timetables"
          requiredTier="Pro"
          requiredPrice="₹3,499/mo"
          description="Empower your facility with automated class timetables, capacity caps, member self-bookings, and waitlist bumps."
          highlights={[
            "Publish weekly HIIT, Yoga, and Spin gym timetables",
            "Hard capacity capping with automated waitlisting",
            "Coach & instructor assignment per session",
            "Direct member booking from member mobile portal",
          ]}
        />
      </div>
    );
  }

  let classes: any[] = [];
  let trainers: any[] = [];

  try {
    const results = await Promise.all([
      prisma.gymClass.findMany({
        where: { gymId, isActive: true },
        include: {
          trainer: { select: { user: { select: { name: true } } } },
          _count: { select: { bookings: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.trainer.findMany({
        where: { gymId, deletedAt: null, isActive: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    classes = results[0];
    trainers = results[1];
  } catch (err) {
    console.error("[ClassesPage Fetch Error]:", err);
  }

  const trainerOptions = trainers.map((t) => ({
    id: t.id,
    name: t.user?.name || "Trainer",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#33281E]">Group Classes &amp; Schedule</h1>
        <p className="mt-1.5 text-sm text-[#8C7A6B]">
          Manage fitness sessions, timetable slots, coach assignments, and member bookings.
        </p>
      </div>

      <ClassesClient classes={classes} trainers={trainerOptions} />
    </div>
  );
}
