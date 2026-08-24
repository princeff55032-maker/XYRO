import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperAdminClient } from "./super-admin-client";

export const metadata = {
  title: "Super Admin Platform Control Center — XYRO",
};

export default async function SuperAdminPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  // ── Core counts ──────────────────────────────────────────────
  const [
    gyms,
    membersCount,
    trainersCount,
    paymentsAgg,
    recentUsers,
    totalUsersCount,
    announcements,
  ] = await Promise.all([
    prisma.gym.findMany({
      where: { deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            lastLoginAt: true,
          },
        },
        subscription: true,
        payments: {
          where: { status: "PAID" },
          select: { totalAmount: true, paidAt: true, createdAt: true },
        },
        members: {
          select: { isActive: true, createdAt: true },
        },
        _count: {
          select: {
            members: true,
            trainers: true,
            payments: true,
            attendance: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.count({ where: { isActive: true } }),
    prisma.trainer.count({ where: { isActive: true } }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { totalAmount: true },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.count(),
    prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        expiresAt: true,
        createdAt: true,
        gym: { select: { name: true } },
      },
    }),
  ]);

  // ── Time boundaries ──────────────────────────────────────────
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // ── SaaS subscription revenue ────────────────────────────────
  let totalSaaSMonthlyRevenue = 0;
  let paidSaaSGyms = 0;

  const planMonthlyPrice: Record<string, number> = {
    FREE: 0,
    STARTER: 1499,
    PRO: 3499,
    BUSINESS: 7999,
  };

  const planDistribution: Record<string, number> = {
    FREE: 0,
    STARTER: 0,
    PRO: 0,
    BUSINESS: 0,
  };

  // ── Per-gym processing ───────────────────────────────────────
  const processedGyms = gyms.map((g) => {
    const totalRev = g.payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const plan = g.subscription?.plan || "FREE";
    const monthlyRate = g.subscription?.price || planMonthlyPrice[plan] || 0;

    planDistribution[plan] = (planDistribution[plan] || 0) + 1;

    if (g.subscription?.status === "ACTIVE" && monthlyRate > 0) {
      totalSaaSMonthlyRevenue += monthlyRate;
      paidSaaSGyms += 1;
    }

    // This month vs last month revenue for per-gym comparison
    const thisMonthRev = g.payments
      .filter((p) => {
        const d = p.paidAt || p.createdAt;
        return d >= thisMonthStart;
      })
      .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    const lastMonthRev = g.payments
      .filter((p) => {
        const d = p.paidAt || p.createdAt;
        return d >= lastMonthStart && d <= lastMonthEnd;
      })
      .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    // Active vs expired memberships
    const activeMembers = g.members.filter((m) => m.isActive).length;
    const totalMembers = g.members.length;

    // New members this month
    const newMembersThisMonth = g.members.filter(
      (m) => m.createdAt >= thisMonthStart
    ).length;

    // Last payment date
    const paidPayments = g.payments
      .filter((p) => p.paidAt)
      .sort((a, b) => (b.paidAt!.getTime()) - (a.paidAt!.getTime()));
    const lastPaymentDate = paidPayments[0]?.paidAt || null;

    // Gym health score
    const daysSinceLastPayment = lastPaymentDate
      ? Math.floor((now.getTime() - lastPaymentDate.getTime()) / 86400000)
      : 999;
    const daysSinceOwnerLogin = g.owner.lastLoginAt
      ? Math.floor(
          (now.getTime() - g.owner.lastLoginAt.getTime()) / 86400000
        )
      : 999;

    let healthStatus: "healthy" | "at_risk" | "inactive" = "healthy";
    if (
      daysSinceLastPayment > 60 ||
      daysSinceOwnerLogin > 60 ||
      g.subscription?.status === "EXPIRED"
    ) {
      healthStatus = "inactive";
    } else if (
      newMembersThisMonth === 0 &&
      daysSinceLastPayment > 30
    ) {
      healthStatus = "at_risk";
    }

    return {
      id: g.id,
      name: g.name,
      gymCode: g.gymCode,
      slug: g.slug,
      email: g.email || "",
      phone: g.phone || "",
      city: g.city,
      state: g.state,
      status: g.status,
      createdAt: g.createdAt,
      owner: g.owner,
      subscription: g.subscription,
      _count: g._count,
      totalRevenue: totalRev,
      thisMonthRevenue: thisMonthRev,
      lastMonthRevenue: lastMonthRev,
      activeMembers,
      totalMembers,
      newMembersThisMonth,
      lastPaymentDate,
      daysSinceOwnerLogin,
      healthStatus,
      avgRevenuePerMember:
        activeMembers > 0 ? Math.round(totalRev / activeMembers) : 0,
    };
  });

  // ── Growth metrics ───────────────────────────────────────────
  const newGymsThisMonth = gyms.filter(
    (g) => g.createdAt >= thisMonthStart
  ).length;
  const newGymsLastMonth = gyms.filter(
    (g) => g.createdAt >= lastMonthStart && g.createdAt <= lastMonthEnd
  ).length;

  const allMembers = gyms.flatMap((g) => g.members);
  const newMembersThisMonth = allMembers.filter(
    (m) => m.createdAt >= thisMonthStart
  ).length;
  const newMembersLastMonth = allMembers.filter(
    (m) => m.createdAt >= lastMonthStart && m.createdAt <= lastMonthEnd
  ).length;

  const activeGymsCount = gyms.filter((g) => g.status === "ACTIVE").length;

  // Monthly active users (logged in this month)
  const monthlyActiveUsers = recentUsers.filter(
    (u) => u.lastLoginAt && u.lastLoginAt >= thisMonthStart
  ).length;

  // Revenue periods
  const allPayments = gyms.flatMap((g) => g.payments);
  const revenueToday = allPayments
    .filter((p) => {
      const d = p.paidAt || p.createdAt;
      return d >= todayStart;
    })
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  const revenueThisWeek = allPayments
    .filter((p) => {
      const d = p.paidAt || p.createdAt;
      return d >= weekStart;
    })
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  const revenueThisMonth = allPayments
    .filter((p) => {
      const d = p.paidAt || p.createdAt;
      return d >= thisMonthStart;
    })
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  const revenueLastMonth = allPayments
    .filter((p) => {
      const d = p.paidAt || p.createdAt;
      return d >= lastMonthStart && d <= lastMonthEnd;
    })
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  // ── Monthly revenue trend (last 6 months) ────────────────────
  const monthlyTrend: { month: string; revenue: number; members: number; gyms: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = mStart.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });

    const rev = allPayments
      .filter((p) => {
        const d = p.paidAt || p.createdAt;
        return d >= mStart && d <= mEnd;
      })
      .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    const memb = allMembers.filter(
      (m) => m.createdAt >= mStart && m.createdAt <= mEnd
    ).length;

    const gymCount = gyms.filter(
      (g) => g.createdAt >= mStart && g.createdAt <= mEnd
    ).length;

    monthlyTrend.push({ month: label, revenue: rev, members: memb, gyms: gymCount });
  }

  // ── Per-gym revenue ranking (top 10) ─────────────────────────
  const gymRevenueRanking = [...processedGyms]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)
    .map((g) => ({
      name: g.name.length > 18 ? g.name.substring(0, 18) + "…" : g.name,
      revenue: g.totalRevenue,
      gymCode: g.gymCode,
    }));

  // ── Recent activity feed ─────────────────────────────────────
  type ActivityItem = {
    type: "payment" | "gym_registered" | "member_joined";
    label: string;
    detail: string;
    timestamp: Date;
  };

  const activityFeed: ActivityItem[] = [];

  // Recent payments
  for (const g of gyms) {
    for (const p of g.payments) {
      const d = p.paidAt || p.createdAt;
      activityFeed.push({
        type: "payment",
        label: `Payment received at ${g.name}`,
        detail: `₹${p.totalAmount.toLocaleString("en-IN")}`,
        timestamp: d,
      });
    }
  }

  // Gym registrations
  for (const g of gyms) {
    activityFeed.push({
      type: "gym_registered",
      label: `${g.name} registered on XYRO`,
      detail: `Owner: ${g.owner.name}`,
      timestamp: g.createdAt,
    });
  }

  // Member signups
  for (const g of gyms) {
    for (const m of g.members) {
      activityFeed.push({
        type: "member_joined",
        label: `New member joined ${g.name}`,
        detail: "",
        timestamp: m.createdAt,
      });
    }
  }

  activityFeed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const recentActivity = activityFeed.slice(0, 25).map((a) => ({
    ...a,
    timestamp: a.timestamp.toISOString(),
  }));

  // ── Assemble analytics payload ───────────────────────────────
  const analytics = {
    totalGyms: gyms.length,
    activeGyms: activeGymsCount,
    totalPlatformMembers: membersCount,
    totalPlatformTrainers: trainersCount,
    totalSaaSMonthlyRevenue,
    totalGymRevenueProcessed: paymentsAgg._sum.totalAmount || 0,
    paidSaaSGyms,
    totalUsers: totalUsersCount,

    // Growth metrics
    newGymsThisMonth,
    newGymsLastMonth,
    newMembersThisMonth,
    newMembersLastMonth,
    monthlyActiveUsers,

    // Revenue periods
    revenueToday,
    revenueThisWeek,
    revenueThisMonth,
    revenueLastMonth,

    // Avg revenue per gym
    avgRevenuePerGym:
      activeGymsCount > 0
        ? Math.round(
            (paymentsAgg._sum.totalAmount || 0) / activeGymsCount
          )
        : 0,

    // Plan distribution
    planDistribution,

    // Monthly trend (last 6 months)
    monthlyTrend,

    // Gym revenue ranking
    gymRevenueRanking,

    // Health summary
    healthyGyms: processedGyms.filter((g) => g.healthStatus === "healthy").length,
    atRiskGyms: processedGyms.filter((g) => g.healthStatus === "at_risk").length,
    inactiveGyms: processedGyms.filter((g) => g.healthStatus === "inactive").length,
  };

  return (
    <SuperAdminClient
      analytics={analytics}
      gyms={processedGyms}
      recentUsers={recentUsers}
      recentActivity={recentActivity}
      announcements={announcements.map((a) => ({
        ...a,
        gymName: a.gym?.name || null,
      }))}
    />
  );
}
