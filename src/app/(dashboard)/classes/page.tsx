import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { ClassesClient } from "./classes-client";

export const metadata = { title: "Classes & Schedule" };

export default async function ClassesPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const [classes, trainers] = await Promise.all([
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

  const trainerOptions = trainers.map((t) => ({
    id: t.id,
    name: t.user.name,
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
