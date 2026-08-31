import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  IndianRupee,
  Activity,
  Timer,
  ArrowRight,
  UserPlus,
  CreditCard,
  ScanLine,
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
  const gymId = session.user.gymId;

  if (!gymId) {
    redirect("/register");
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  let gym: { name: string; gymCode: string } | null = null;
  let activeMembers = 0;
  let totalMembers = 0;
  let newMembersThisMonth = 0;
  let monthlyInflow = 0;
  let todayInflow = 0;
  let todayCheckins = 0;
  let currentlyInside = 0;
  let expiringSoon: Array<{
    id: string;
    endDate: Date;
    member: { user: { name: string; email: string; phone: string | null } } | null;
    plan: { name: string } | null;
  }> = [];
  let overdueMembers = 0;
  let recentMembers: Array<{
    id: string;
    memberId: string;
    user: { name: string; email: string; phone: string | null } | null;
  }> = [];
  let recentPayments: Array<{
    id: string;
    method: string;
    paidAt: Date | null;
    totalAmount: number;
    member: { user: { name: string } | null } | null;
  }> = [];
  let days: { day: string; revenue: number }[] = [];

  try {
    const [
      gymRes,
      activeMembersRes,
      totalMembersRes,
      newMembersThisMonthRes,
      monthRevenueRes,
      todayRevenueRes,
      todayCheckinsRes,
      currentlyInsideRes,
      expiringSoonRes,
      overdueMembersRes,
      recentMembersRes,
      recentPaymentsRes,
      payments14dRes,
    ] = await Promise.all([
      prisma.gym.findUnique({ where: { id: gymId }, select: { name: true, gymCode: true } }),
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
    ]);

    gym = gymRes;
    activeMembers = activeMembersRes;
    totalMembers = totalMembersRes;
    newMembersThisMonth = newMembersThisMonthRes;
    monthlyInflow = monthRevenueRes?._sum?.totalAmount ?? 0;
    todayInflow = todayRevenueRes?._sum?.totalAmount ?? 0;
    todayCheckins = todayCheckinsRes;
    currentlyInside = currentlyInsideRes;
    expiringSoon = (expiringSoonRes as any) || [];
    overdueMembers = overdueMembersRes;
    recentMembers = (recentMembersRes as any) || [];
    recentPayments = (recentPaymentsRes as any) || [];

    // 14-Day revenue series
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d.getTime() + 86400000);
      const sum = (payments14dRes || [])
        .filter((p) => p.paidAt && p.paidAt >= d && p.paidAt < next)
        .reduce((acc, p) => acc + (p.totalAmount || 0), 0);
      days.push({ day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), revenue: sum });
    }
  } catch (err) {
    console.error("[DashboardPage Data Load Error]:", err);
  }

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
              {gym?.gymCode || session.user.gymCode || "XYRO-001"}
            </span>
          </div>
          <p className="text-xs text-[#8C7A6B] mt-0.5">
            Real-time business outcomes and management console for {gym?.name || "Gym Workspace"}.
          </p>
        </div>

        {/* Quick Action Commands */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/members">
            <Button size="sm" variant="outline" className="h-8.5 rounded-xl text-xs border-[#E5D9C5] bg-white text-[#33281E] hover:bg-[#F3EFEA]">
              <UserPlus className="h-3.5 w-3.5 text-[#8B5E34]" />
              <span>Enroll Member</span>
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

      {/* 4 Outcome Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(todayInflow)}
          icon={IndianRupee}
          hint={`MTD Inflow: ${formatCurrency(monthlyInflow)}`}
        />
        <StatCard
          label="Active Member Roster"
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
                      {m.member?.user?.name || "Member"}
                    </p>
                    <p className="truncate font-mono text-[10px] text-[#8C7A6B]">{m.plan?.name || "Plan"}</p>
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
        {/* Recent Member Registrations */}
        <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="mb-4 flex items-center justify-between border-b border-[#E5D9C5] pb-3">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#8B5E34]">
                Recent Members Enrolled
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
                    <p className="font-bold text-[#33281E]">{m.user?.name || "Member"}</p>
                    <p className="font-mono text-[11px] text-[#8C7A6B]">{m.user?.phone || m.user?.email || "—"}</p>
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
                    <p className="font-bold text-[#33281E]">{p.member?.user?.name || "Direct Inflow / Guest"}</p>
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
