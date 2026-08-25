import Link from "next/link";
import {
  Users,
  IndianRupee,
  Activity,
  Timer,
  ArrowRight,
  UserPlus,
  CreditCard,
  ScanLine,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Clock,
  HeartPulse,
} from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const [
    gym,
    activeMembers,
    totalMembers,
    newMembersThisMonth,
    monthRevenue,
    todayRevenue,
    todayCheckins,
    currentlyInside,
    expiringSoon,
    overdueMembers,
    recentMembers,
    recentPayments,
    payments14d,
    totalTrainers,
    assignedMembersCount,
  ] = await Promise.all([
    prisma.gym.findUnique({ where: { id: gymId } }),
    prisma.member.count({ where: { gymId, isActive: true, deletedAt: null } }),
    prisma.member.count({ where: { gymId, deletedAt: null } }),
    prisma.member.count({
      where: { gymId, deletedAt: null, createdAt: { gte: monthStart } },
    }),
    prisma.payment.aggregate({
      where: {
        gymId,
        status: "PAID",
        paidAt: { gte: monthStart },
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: {
        gymId,
        status: "PAID",
        paidAt: { gte: todayStart },
      },
      _sum: { totalAmount: true },
    }),
    prisma.attendance.count({
      where: {
        gymId,
        date: { gte: todayStart },
      },
    }),
    prisma.attendance.count({
      where: {
        gymId,
        date: { gte: todayStart },
        checkIn: { gte: twoHoursAgo },
        checkOut: null,
      },
    }),
    prisma.membership.findMany({
      where: {
        gymId,
        status: "ACTIVE",
        endDate: {
          gte: now,
          lte: new Date(Date.now() + 7 * 86400000),
        },
      },
      include: {
        member: { include: { user: { select: { name: true, email: true, phone: true } } } },
        plan: { select: { name: true } },
      },
      orderBy: { endDate: "asc" },
      take: 6,
    }),
    prisma.membership.count({
      where: {
        gymId,
        status: "EXPIRED",
      },
    }),
    prisma.member.findMany({
      where: { gymId, deletedAt: null },
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { gymId, status: "PAID" },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { paidAt: "desc" },
      take: 5,
    }),
    prisma.payment.findMany({
      where: {
        gymId,
        status: "PAID",
        paidAt: { gte: new Date(Date.now() - 13 * 86400000) },
      },
      select: { totalAmount: true, paidAt: true },
    }),
    prisma.trainer.count({ where: { gymId, deletedAt: null, isActive: true } }),
    prisma.member.count({ where: { gymId, deletedAt: null, trainerId: { not: null } } }),
  ]);

  // 14-Day revenue series
  const days: { day: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d.getTime() + 86400000);
    const sum = payments14d
      .filter((p) => p.paidAt && p.paidAt >= d && p.paidAt < next)
      .reduce((acc, p) => acc + p.totalAmount, 0);
    days.push({ day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), revenue: sum });
  }

  // Attendance and Occupancy Rates
  const attendancePct =
    activeMembers > 0 ? Math.round((todayCheckins / activeMembers) * 100) : 0;

  // ── Compute GYM HEALTH SCORE (0 - 100) ──────────────────────────
  // 1. Revenue Run-Rate (Max 20 pts)
  const monthlyInflow = monthRevenue._sum.totalAmount ?? 0;
  const revScore = monthlyInflow > 100000 ? 20 : monthlyInflow > 50000 ? 16 : monthlyInflow > 15000 ? 12 : monthlyInflow > 0 ? 8 : 4;

  // 2. Retention (Max 20 pts)
  const retentionScore = overdueMembers === 0 ? 20 : overdueMembers < 5 ? 16 : overdueMembers < 15 ? 12 : 6;

  // 3. Attendance Activity (Max 20 pts)
  const attScore = attendancePct > 35 ? 20 : attendancePct > 20 ? 16 : attendancePct > 10 ? 12 : attendancePct > 0 ? 8 : 4;

  // 4. Collections / Zero Overdue (Max 15 pts)
  const colScore = overdueMembers === 0 ? 15 : overdueMembers < 3 ? 12 : overdueMembers < 8 ? 8 : 4;

  // 5. Membership Growth Velocity (Max 15 pts)
  const growthScore = newMembersThisMonth > 10 ? 15 : newMembersThisMonth > 3 ? 12 : newMembersThisMonth > 0 ? 8 : 4;

  // 6. Trainer Allocation (Max 10 pts)
  const trainerScore = totalTrainers > 0 && assignedMembersCount > 0 ? 10 : totalTrainers > 0 ? 7 : 5;

  const totalHealthScore = Math.min(100, revScore + retentionScore + attScore + colScore + growthScore + trainerScore);
  const healthGrade = totalHealthScore >= 85 ? "EXCELLENT" : totalHealthScore >= 70 ? "HEALTHY" : "NEEDS ATTENTION";
  const healthColor = totalHealthScore >= 85 ? "text-emerald-800" : totalHealthScore >= 70 ? "text-[#8B5E34]" : "text-amber-800";

  return (
    <div className="space-y-6 max-w-full">
      {/* Command Bar / Section Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#E5D9C5] pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-[#33281E] tracking-tight">
              Floor Operations Overview
            </h1>
            <span className="rounded-full border border-[#E5D9C5] bg-[#F9F8F6] px-2.5 py-0.5 text-[10px] font-bold text-[#8B5E34] font-mono">
              {gym?.gymCode}
            </span>
          </div>
          <p className="text-xs text-[#8C7A6B] mt-0.5">
            Real-time business outcomes and management console for {gym?.name}.
          </p>
        </div>

        {/* Quick Action Commands */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/members">
            <Button size="sm" variant="outline" className="h-8.5 rounded-xl text-xs border-[#E5D9C5] bg-white text-[#33281E] hover:bg-[#F3EFEA]">
              <UserPlus className="h-3.5 w-3.5 text-[#8B5E34]" />
              <span>Enroll Athlete</span>
            </Button>
          </Link>
          <Link href="/payments">
            <Button size="sm" variant="outline" className="h-8.5 rounded-xl text-xs border-[#E5D9C5] bg-white text-[#33281E] hover:bg-[#F3EFEA]">
              <CreditCard className="h-3.5 w-3.5 text-[#8B5E34]" />
              <span>Record Inflow</span>
            </Button>
          </Link>
          <Link href="/attendance">
            <Button size="sm" variant="default" className="btn-primary h-8.5 rounded-xl text-xs shadow-sm text-white font-bold">
              <ScanLine className="h-3.5 w-3.5" />
              <span>Scan Dynamic Pass</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Prominent GYM HEALTH SCORE BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E5D9C5] bg-gradient-to-br from-white via-[#FAF9F7] to-[#F3EFEA] p-6 md:p-7 shadow-[0_4px_25px_rgba(51,40,30,0.04)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-[#8B5E34]" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#8B5E34]">
                Facility Health Score
              </h2>
              <Badge variant={totalHealthScore >= 80 ? "success" : "warning"} className="font-mono text-[10px]">
                {healthGrade}
              </Badge>
            </div>
            <p className="text-xs text-[#8C7A6B] max-w-xl">
              Composite telemetry evaluating revenue velocity, renewal retention, attendance activity, collections, and coach allocation.
            </p>

            {/* Health Score Breakdown Badges */}
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
              <span className="rounded-lg border border-[#E5D9C5] bg-white px-2.5 py-1 text-[#33281E]">
                Revenue: <strong>{revScore}/20</strong>
              </span>
              <span className="rounded-lg border border-[#E5D9C5] bg-white px-2.5 py-1 text-[#33281E]">
                Retention: <strong>{retentionScore}/20</strong>
              </span>
              <span className="rounded-lg border border-[#E5D9C5] bg-white px-2.5 py-1 text-[#33281E]">
                Floor Activity: <strong>{attScore}/20</strong>
              </span>
              <span className="rounded-lg border border-[#E5D9C5] bg-white px-2.5 py-1 text-[#33281E]">
                Collections: <strong>{colScore}/15</strong>
              </span>
              <span className="rounded-lg border border-[#E5D9C5] bg-white px-2.5 py-1 text-[#33281E]">
                Growth: <strong>{growthScore}/15</strong>
              </span>
            </div>
          </div>

          {/* Big Score Gauge */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[#8B5E34]/30 bg-white px-7 py-4 shadow-sm">
              <span className={`font-display text-4xl font-black ${healthColor}`}>
                {totalHealthScore}
              </span>
              <span className="font-mono text-[10px] font-bold text-[#8C7A6B] uppercase mt-0.5">
                Out of 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Outcome Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(todayRevenue._sum.totalAmount ?? 0)}
          icon={IndianRupee}
          hint={`MTD Inflow: ${formatCurrency(monthlyInflow)}`}
        />
        <StatCard
          label="Active Athlete Roster"
          value={activeMembers}
          icon={Users}
          hint={`+${newMembersThisMonth} new enrolled this month`}
        />
        <StatCard
          label="Live Floor Occupancy"
          value={`${currentlyInside} Inside`}
          icon={Activity}
          hint={`${todayCheckins} verified check-ins today`}
        />
        <StatCard
          label="Renewal Radar (7 Days)"
          value={expiringSoon.length}
          icon={Timer}
          hint={`${overdueMembers} accounts overdue / expired`}
        />
      </div>

      {/* Main Grid: Revenue Trajectory + Expiring Roster */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Trajectory Area (2 Cols) */}
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-[#E5D9C5] pb-3">
            <div>
              <h2 className="font-mono text-xs font-bold text-[#8B5E34] uppercase tracking-widest">
                Revenue Trajectory (14-Day Inflow)
              </h2>
              <p className="text-[11px] text-[#8C7A6B] mt-0.5">Daily recorded receipts &amp; renewals</p>
            </div>
            <Link
              href="/payments"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B5E34] hover:underline transition-colors"
            >
              Ledger <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <RevenueChart data={days} />
        </div>

        {/* Expiring Memberships Window */}
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="mb-3.5 flex items-center justify-between border-b border-[#E5D9C5] pb-3">
            <h2 className="font-mono text-xs font-bold text-[#8B5E34] uppercase tracking-widest">
              Expiring Soon
            </h2>
            <Badge variant="warning" className="text-[10px] py-0.5 px-2 font-mono">{expiringSoon.length} Due</Badge>
          </div>

          {expiringSoon.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs text-[#8C7A6B]">No active plans expiring within 7 days.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expiringSoon.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2.5 rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-3.5 py-2.5 transition-colors hover:border-[#8B5E34]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#33281E]">
                      {m.member.user.name}
                    </p>
                    <p className="truncate font-mono text-[10px] text-[#8C7A6B]">{m.plan.name}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] font-bold text-[#8B5E34] bg-white px-2 py-0.5 rounded-full border border-[#E5D9C5]">
                    {formatDate(m.endDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Activity Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Athlete Registrations */}
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="mb-4 flex items-center justify-between border-b border-[#E5D9C5] pb-3">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#8B5E34]">
                Recent Athletes Enrolled
              </h3>
              <p className="text-[11px] text-[#8C7A6B] mt-0.5">Latest registrations across this workspace</p>
            </div>
            <Link href="/members" className="text-xs text-[#8B5E34] font-semibold hover:underline">
              View All ({totalMembers})
            </Link>
          </div>

          <div className="divide-y divide-[#E5D9C5]">
            {recentMembers.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#8C7A6B]">No members enrolled yet.</p>
            ) : (
              recentMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-bold text-[#33281E]">{m.user.name}</p>
                    <p className="font-mono text-[11px] text-[#8C7A6B]">{m.user.phone || m.user.email}</p>
                  </div>
                  <span className="font-mono text-[11px] text-[#8B5E34] bg-[#F9F8F6] px-2 py-0.5 rounded-md border border-[#E5D9C5]">
                    {m.memberId}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payment Transactions */}
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="mb-4 flex items-center justify-between border-b border-[#E5D9C5] pb-3">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#8B5E34]">
                Recent Inflows &amp; Receipts
              </h3>
              <p className="text-[11px] text-[#8C7A6B] mt-0.5">Verified payment collections</p>
            </div>
            <Link href="/payments" className="text-xs text-[#8B5E34] font-semibold hover:underline">
              Ledger
            </Link>
          </div>

          <div className="divide-y divide-[#E5D9C5]">
            {recentPayments.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#8C7A6B]">No payment transactions recorded yet.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-bold text-[#33281E]">{p.member.user.name}</p>
                    <p className="font-mono text-[11px] text-[#8C7A6B]">
                      {p.method} · {p.paidAt ? formatDate(p.paidAt) : "Recently"}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    +{formatCurrency(p.totalAmount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
