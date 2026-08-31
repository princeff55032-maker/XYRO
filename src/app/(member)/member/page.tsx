import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  Calendar,
  Clock,
  Dumbbell,
  Salad,
  CreditCard,
  UserCheck,
  Flame,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Phone,
  Mail,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, daysRemaining, getInitials } from "@/lib/utils";
import { MemberQrPass } from "./qr-pass";
import { MemberPaymentCheckout } from "./member-payment-checkout";
import { DailyProgressTracker } from "./daily-progress-tracker";

export const metadata = {
  title: "Member Portal",
};

export default async function MemberPortalPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/member");
  }

  // Fetch complete member profile and records
  const member = await prisma.member.findUnique({
    where: { userId: session.user.id },
    include: {
      gym: true,
      user: true,
      assignedTrainer: {
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      },
      memberships: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      },
      attendance: {
        orderBy: { date: "desc" },
        take: 10,
      },
      progressRecords: {
        orderBy: { date: "desc" },
        take: 30,
      },
      workoutPlans: {
        where: { isActive: true },
        include: { exercises: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      dietPlans: {
        where: { isActive: true },
        include: { meals: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { invoice: true },
      },
    },
  });

  if (!member) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white p-12 py-20 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
        <p className="font-display text-xl font-bold text-[#33281E]">
          Member Profile Not Found
        </p>
        <p className="max-w-sm text-xs text-[#8C7A6B]">
          Your account is not linked to any active gym member record yet. Please contact
          your gym administrator to register your pass.
        </p>
      </div>
    );
  }

  const activeMembership = member.memberships.find((m) => m.status === "ACTIVE");
  const daysLeft = activeMembership ? daysRemaining(activeMembership.endDate) : 0;
  const isPassValid = member.isActive && !!activeMembership && daysLeft > 0;

  const currentWorkout = member.workoutPlans[0];
  const currentDiet = member.dietPlans[0];

  return (
    <div className="space-y-8">
      {/* 1. Digital QR Pass Banner */}
      <MemberQrPass
        memberId={member.memberId}
        memberName={member.user?.name || "Member"}
        gymName={member.gym?.name || "Gym"}
        gymCode={member.gym?.gymCode || "XYRO-001"}
        planName={activeMembership?.plan?.name}
        timeSlot={member.timeSlot}
        isValid={isPassValid}
      />

      {/* 2. Membership Status & Quick Metric Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Membership Status
            </span>
            <Badge variant={isPassValid ? "success" : "destructive"}>
              {activeMembership?.status || "NO PLAN"}
            </Badge>
          </div>
          <p className="mt-3 font-display text-xl font-bold text-[#33281E]">
            {activeMembership?.plan?.name || "Expired"}
          </p>
          <p className="mt-1 text-xs text-[#8C7A6B]">
            {activeMembership
              ? `Valid until ${formatDate(activeMembership.endDate)}`
              : "Contact reception to renew"}
          </p>
          <div className="mt-3">
            <MemberPaymentCheckout
              memberName={member.user?.name || "Member"}
              gymName={member.gym?.name || "Gym"}
              currentPlanName={activeMembership?.plan?.name}
              planPrice={activeMembership?.plan?.price}
            />
          </div>
        </div>


        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Days Remaining
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-[#8B5E34]">
            {daysLeft} Days
          </p>
          <p className="mt-1 text-xs text-[#8C7A6B]">
            {daysLeft <= 7 && daysLeft > 0 ? "Renewal due soon" : "Active & in good standing"}
          </p>
        </div>

        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Total Check-ins
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8B5E34]/10 text-[#8B5E34]">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-[#33281E]">
            {member.attendance.length} Visits
          </p>
          <p className="mt-1 text-xs text-[#8C7A6B]">Recent attendance records</p>
        </div>

        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-5 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
              Coach &amp; Time Slot
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-base font-bold text-[#33281E] truncate">
            {member.assignedTrainer?.user?.name || "Gym Floor Trainer"}
          </p>
          <p className="mt-1 text-xs text-[#8B5E34] font-medium truncate">
            {member.timeSlot ? `⏰ ${member.timeSlot}` : "⏰ All Day / Flexible"}
          </p>
        </div>
      </div>

      {/* 3. Daily Progress & Body Metrics Tracker */}
      <DailyProgressTracker records={member.progressRecords} />

      {/* 4. Workout & Diet Programs Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workout Plan Card */}
        <div className="flex flex-col rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#33281E]">
                  {currentWorkout ? currentWorkout.name : "My Workout Routine"}
                </h3>
                <p className="text-xs text-[#8C7A6B]">
                  Custom training split tailored for you
                </p>
              </div>
            </div>
            {currentWorkout && (
              <Badge variant="default">{currentWorkout.exercises.length} Exercises</Badge>
            )}
          </div>

          <div className="mt-6 flex-1 space-y-3">
            {currentWorkout && currentWorkout.exercises.length > 0 ? (
              currentWorkout.exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-3.5 transition hover:bg-[#F3EFEA]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#8B5E34]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#8B5E34]">
                        {ex.dayOfWeek}
                      </span>
                      <p className="font-bold text-sm text-[#33281E] truncate">
                        {ex.exerciseName}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[#8C7A6B]">
                      {ex.muscleGroup ? `${ex.muscleGroup} • ` : ""}
                      {ex.sets} Sets × {ex.reps} Reps
                      {ex.weight ? ` @ ${ex.weight}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-mono text-[#8C7A6B]">
                    {ex.restSeconds}s rest
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5D9C5] py-12 text-center bg-[#F9F8F6]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#E5D9C5] text-[#8C7A6B] mb-2">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-[#33281E]">No active workout split</p>
                <p className="text-xs text-[#8C7A6B] max-w-xs mt-1">
                  Your trainer or gym floor coach will assign a customized workout program
                  for your goals.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Diet & Nutrition Plan Card */}
        <div className="flex flex-col rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Salad className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#33281E]">
                  {currentDiet ? currentDiet.name : "My Nutrition Plan"}
                </h3>
                <p className="text-xs text-[#8C7A6B]">Daily meal schedule and intake goals</p>
              </div>
            </div>
            {currentDiet?.totalCalories && (
              <Badge variant="warning">{currentDiet.totalCalories} kcal/day</Badge>
            )}
          </div>

          <div className="mt-6 flex-1 space-y-3">
            {currentDiet && currentDiet.meals.length > 0 ? (
              currentDiet.meals.map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-3.5 space-y-1.5 transition hover:bg-[#F3EFEA]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                      {meal.mealType}
                    </span>
                    {meal.time && (
                      <span className="text-xs font-mono text-[#8C7A6B]">
                        {meal.time}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#33281E]">{meal.foodItems}</p>
                  {meal.calories && (
                    <p className="text-xs text-[#8C7A6B]">Approx {meal.calories} kcal</p>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5D9C5] py-12 text-center bg-[#F9F8F6]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#E5D9C5] text-[#8C7A6B] mb-2">
                  <Salad className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-[#33281E]">No active diet plan</p>
                <p className="text-xs text-[#8C7A6B] max-w-xs mt-1">
                  Ask your trainer for a customized macro-balanced meal schedule.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Check-in History & Payment Receipts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance History */}
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <h3 className="font-display text-lg font-bold text-[#33281E] border-b border-[#E5D9C5] pb-4">
            Recent Check-in Logs
          </h3>

          <div className="mt-4 space-y-2.5">
            {member.attendance.length > 0 ? (
              member.attendance.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-4 py-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-emerald-700" />
                    <div>
                      <p className="font-semibold text-[#33281E]">
                        {formatDate(att.date, "long")}
                      </p>
                      <p className="text-[11px] text-[#8C7A6B]">
                        Check-in at {new Date(att.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {att.method}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-[#8C7A6B]">
                No check-in records logged yet. Use your QR pass to check in!
              </p>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <h3 className="font-display text-lg font-bold text-[#33281E] border-b border-[#E5D9C5] pb-4">
            Membership Payments & Receipts
          </h3>

          <div className="mt-4 space-y-2.5">
            {member.payments.length > 0 ? (
              member.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-4 py-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-[#8B5E34]" />
                    <div>
                      <p className="font-semibold text-[#33281E]">
                        {formatCurrency(p.totalAmount)}
                      </p>
                      <p className="text-[11px] text-[#8C7A6B]">
                        Paid via {p.method} • {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={p.status === "PAID" ? "success" : "warning"}>
                    {p.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-[#8C7A6B]">
                No past transactions recorded.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
