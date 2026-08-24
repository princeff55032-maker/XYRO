"use client";

import { useState, useTransition, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Crown,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Dumbbell,
  Check,
  X,
  Activity,
  BarChart3,
  PieChart,
  UserPlus,
  Eye,
  EyeOff,
  KeyRound,
  Megaphone,
  Clock,
  Zap,
  CircleDollarSign,
  BadgeCheck,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  Calendar,
  IndianRupee,
  AlertCircle,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import {
  toggleGymStatusAction,
  updateGymSubscriptionAction,
  toggleUserStatusAction,
  forcePasswordResetAction,
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "./actions";
import type { GymStatus, SubscriptionPlan, AccountStatus } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────

interface Analytics {
  totalGyms: number;
  activeGyms: number;
  totalPlatformMembers: number;
  totalPlatformTrainers: number;
  totalSaaSMonthlyRevenue: number;
  totalGymRevenueProcessed: number;
  paidSaaSGyms: number;
  totalUsers: number;
  newGymsThisMonth: number;
  newGymsLastMonth: number;
  newMembersThisMonth: number;
  newMembersLastMonth: number;
  monthlyActiveUsers: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  avgRevenuePerGym: number;
  planDistribution: Record<string, number>;
  monthlyTrend: { month: string; revenue: number; members: number; gyms: number }[];
  gymRevenueRanking: { name: string; revenue: number; gymCode: string }[];
  healthyGyms: number;
  atRiskGyms: number;
  inactiveGyms: number;
}

interface GymData {
  id: string;
  name: string;
  gymCode: string;
  slug: string;
  email: string;
  phone: string;
  city: string | null;
  state: string | null;
  status: GymStatus;
  createdAt: Date;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    lastLoginAt: Date | null;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: string;
    price: number;
    endDate: Date;
  } | null;
  _count: {
    members: number;
    trainers: number;
    payments: number;
    attendance: number;
  };
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  activeMembers: number;
  totalMembers: number;
  newMembersThisMonth: number;
  lastPaymentDate: Date | null;
  daysSinceOwnerLogin: number;
  healthStatus: "healthy" | "at_risk" | "inactive";
  avgRevenuePerMember: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface ActivityItem {
  type: "payment" | "gym_registered" | "member_joined";
  label: string;
  detail: string;
  timestamp: string;
}

interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  priority: string;
  expiresAt: Date | null;
  createdAt: Date;
  gymName: string | null;
}

interface SuperAdminClientProps {
  analytics: Analytics;
  gyms: GymData[];
  recentUsers: UserData[];
  recentActivity: ActivityItem[];
  announcements: AnnouncementData[];
}

// ─── Helper: Growth badge ──────────────────────────────────────

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return <span className="text-[10px] font-semibold text-emerald-700">NEW</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-[10px] text-[#8C7A6B]">→ 0%</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${pct > 0 ? "text-emerald-700" : "text-red-600"}`}>
      {pct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct > 0 ? "+" : ""}{pct}%
    </span>
  );
}

// ─── Helper: Health indicator ──────────────────────────────────

function HealthDot({ status }: { status: "healthy" | "at_risk" | "inactive" }) {
  const config = {
    healthy: { color: "bg-emerald-600", ring: "ring-emerald-500/20", label: "Healthy" },
    at_risk: { color: "bg-amber-600", ring: "ring-amber-500/20", label: "At Risk" },
    inactive: { color: "bg-red-600", ring: "ring-red-500/20", label: "Inactive" },
  };
  const c = config[status];
  return (
    <span className="inline-flex items-center gap-1.5" title={c.label}>
      <span className={`h-2.5 w-2.5 rounded-full ${c.color} ring-4 ${c.ring}`} />
      <span className="text-[10px] text-[#8C7A6B] font-medium">{c.label}</span>
    </span>
  );
}

// ─── SVG Charts ────────────────────────────────────────────────

function BarChartSVG({ data, valueKey, labelKey, color = "#8B5E34" }: {
  data: Record<string, unknown>[];
  valueKey: string;
  labelKey: string;
  color?: string;
}) {
  const maxVal = Math.max(...data.map((d) => (d[valueKey] as number) || 0), 1);
  const barWidth = Math.max(24, Math.floor(440 / data.length) - 8);

  return (
    <svg viewBox={`0 0 ${data.length * (barWidth + 8) + 40} 180`} className="w-full h-40">
      {data.map((d, i) => {
        const val = (d[valueKey] as number) || 0;
        const h = (val / maxVal) * 130;
        const x = i * (barWidth + 8) + 20;
        return (
          <g key={i}>
            <rect
              x={x}
              y={145 - h}
              width={barWidth}
              height={h}
              rx={6}
              fill={color}
              opacity={0.88}
            />
            <text
              x={x + barWidth / 2}
              y={162}
              textAnchor="middle"
              className="fill-[#8C7A6B]"
              fontSize="9"
            >
              {d[labelKey] as string}
            </text>
            {val > 0 && (
              <text
                x={x + barWidth / 2}
                y={140 - h}
                textAnchor="middle"
                className="fill-[#33281E]"
                fontSize="9"
                fontWeight="700"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function LineChartSVG({ data, valueKey, labelKey, color = "#8B5E34" }: {
  data: Record<string, unknown>[];
  valueKey: string;
  labelKey: string;
  color?: string;
}) {
  const maxVal = Math.max(...data.map((d) => (d[valueKey] as number) || 0), 1);
  const w = 480;
  const h = 140;
  const points = data.map((d, i) => {
    const val = (d[valueKey] as number) || 0;
    const x = (i / Math.max(data.length - 1, 1)) * (w - 60) + 30;
    const y = h - 20 - (val / maxVal) * (h - 40);
    return { x, y, val, label: d[labelKey] as string };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1]?.x ?? 0} ${h - 20} L ${points[0]?.x ?? 0} ${h - 20} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full h-44">
      <defs>
        <linearGradient id={`lg-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#lg-${valueKey})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#FFFFFF" strokeWidth="2" />
          <text x={p.x} y={h + 12} textAnchor="middle" className="fill-[#8C7A6B]" fontSize="9">
            {p.label}
          </text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-[#33281E]" fontSize="9" fontWeight="700">
            {p.val >= 1000 ? `${(p.val / 1000).toFixed(1)}k` : p.val}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DonutChartSVG({ data, colors }: {
  data: { label: string; value: number }[];
  colors: string[];
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0">
        {data.map((d, i) => {
          const pct = d.value / total;
          const dashArray = `${pct * circumference} ${circumference}`;
          const rotation = (accumulated / total) * 360 - 90;
          accumulated += d.value;
          return (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="18"
              strokeDasharray={dashArray}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform={`rotate(${rotation} 70 70)`}
              opacity="0.9"
            />
          );
        })}
        <text x="70" y="66" textAnchor="middle" className="fill-[#33281E]" fontSize="18" fontWeight="700">
          {total}
        </text>
        <text x="70" y="82" textAnchor="middle" className="fill-[#8C7A6B]" fontSize="10">
          Total Gyms
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[#8C7A6B]">{d.label}</span>
            <span className="font-bold text-[#33281E] ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export function SuperAdminClient({
  analytics,
  gyms,
  recentUsers,
  recentActivity,
  announcements,
}: SuperAdminClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"overview" | "revenue" | "gyms" | "users">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [userSearch, setUserSearch] = useState("");
  const [expandedGym, setExpandedGym] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Announcement form
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    priority: "NORMAL",
    expiresInDays: 7,
  });
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);

  // ── Handlers ───────────────────────────────────────────────

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleStatusToggle = (gymId: string, currentStatus: GymStatus) => {
    const nextStatus: GymStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    startTransition(async () => {
      const res = await toggleGymStatusAction(gymId, nextStatus);
      if (res.ok) {
        showFeedback("success", `Gym status updated to ${nextStatus}.`);
        router.refresh();
      } else {
        showFeedback("error", res.error || "Failed to update gym status.");
      }
    });
  };

  const handlePlanChange = (gymId: string, plan: SubscriptionPlan) => {
    startTransition(async () => {
      const res = await updateGymSubscriptionAction(gymId, plan, "ACTIVE");
      if (res.ok) {
        showFeedback("success", `Subscription plan upgraded to ${plan}.`);
        router.refresh();
      } else {
        showFeedback("error", res.error || "Failed to update subscription.");
      }
    });
  };

  const handleUserStatusToggle = (userId: string, currentStatus: string) => {
    const nextStatus: AccountStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    startTransition(async () => {
      const res = await toggleUserStatusAction(userId, nextStatus);
      if (res.ok) {
        showFeedback("success", `User status updated to ${nextStatus}.`);
        router.refresh();
      } else {
        showFeedback("error", res.error || "Failed to update user.");
      }
    });
  };

  const handleForcePasswordReset = (userId: string, userName: string) => {
    if (!confirm(`Force password reset for "${userName}"? They will need to change their password on next login.`)) return;
    startTransition(async () => {
      const res = await forcePasswordResetAction(userId);
      if (res.ok) {
        const d = res.data as { tempPassword: string; message: string };
        showFeedback("success", `${d.message} Temporary password: ${d.tempPassword}`);
        router.refresh();
      } else {
        showFeedback("error", res.error || "Failed to reset password.");
      }
    });
  };

  const handleCreateAnnouncement = () => {
    startTransition(async () => {
      const res = await createAnnouncementAction(announcementForm);
      if (res.ok) {
        showFeedback("success", "Announcement broadcast to all active gyms.");
        setAnnouncementForm({ title: "", content: "", priority: "NORMAL", expiresInDays: 7 });
        setShowAnnouncementForm(false);
        router.refresh();
      } else {
        showFeedback("error", res.error || "Failed to create announcement.");
      }
    });
  };

  // ── Filters ────────────────────────────────────────────────

  const filteredGyms = useMemo(() => {
    return gyms.filter((g) => {
      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.gymCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.owner.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" ? true : g.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [gyms, searchQuery, statusFilter]);

  const filteredUsers = useMemo(() => {
    return recentUsers.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = userRoleFilter === "ALL" ? true : u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [recentUsers, userSearch, userRoleFilter]);

  // ── Tab config ─────────────────────────────────────────────

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Activity },
    { key: "revenue" as const, label: "Revenue & Analytics", icon: BarChart3 },
    { key: "gyms" as const, label: `Gyms (${gyms.length})`, icon: Building2 },
    { key: "users" as const, label: `Users (${recentUsers.length})`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Hero Banner ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(51,40,30,0.04)]">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight text-[#33281E] md:text-4xl">
                Platform Control Center
              </h1>
              <Badge className="border-[#E5D9C5] bg-[#F9F8F6] text-[#8B5E34] font-mono text-[11px] font-bold">
                Super Admin Master Access
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-xs text-[#8C7A6B] leading-relaxed">
              Global overview of all registered gyms, SaaS subscription earnings, member metrics, and multi-tenant controls across the entire XYRO network.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Quick Stats Pills */}
            <div className="hidden md:flex items-center gap-3">
              <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-3.5 py-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">Today</p>
                <p className="text-sm font-bold font-display text-emerald-800">{formatCurrency(analytics.revenueToday)}</p>
              </div>
              <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-3.5 py-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">This Week</p>
                <p className="text-sm font-bold font-display text-[#8B5E34]">{formatCurrency(analytics.revenueThisWeek)}</p>
              </div>
              <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-3.5 py-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B]">This Month</p>
                <p className="text-sm font-bold font-display text-[#33281E]">{formatCurrency(analytics.revenueThisMonth)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5E34] text-white shadow-sm">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-[#8C7A6B] font-medium">SaaS MRR</p>
                <p className="font-display text-xl font-bold text-[#33281E]">
                  {formatCurrency(analytics.totalSaaSMonthlyRevenue)}
                  <span className="text-xs text-[#8C7A6B] font-normal"> /mo</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Feedback ─────────────────────────────────── */}
      {feedback && (
        <div className={`flex items-center justify-between rounded-2xl border p-4 text-xs transition ${
          feedback.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="break-all font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 shrink-0 ml-2 font-bold cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* ─── Tab Navigation ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5D9C5] pb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === t.key
                ? "bg-[#8B5E34] text-white shadow-sm"
                : "text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E]"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          TAB 1: OVERVIEW
         ════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stat Cards Grid — 8 cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Registered Gyms"
              value={analytics.totalGyms}
              sub={<><span className="text-emerald-700 font-semibold">{analytics.activeGyms} Active</span> · {analytics.totalGyms - analytics.activeGyms} Other</>}
              icon={<Building2 className="h-5 w-5 text-[#8B5E34]" />}
            />
            <StatCard
              label="Platform Members"
              value={analytics.totalPlatformMembers}
              sub={<>New this month: <span className="text-emerald-700 font-semibold">{analytics.newMembersThisMonth}</span> <GrowthBadge current={analytics.newMembersThisMonth} previous={analytics.newMembersLastMonth} /></>}
              icon={<Users className="h-5 w-5 text-[#8B5E34]" />}
            />
            <StatCard
              label="Platform Trainers"
              value={analytics.totalPlatformTrainers}
              sub="Coaches registered across all gyms"
              icon={<Dumbbell className="h-5 w-5 text-[#8B5E34]" />}
            />
            <StatCard
              label="Total Revenue Processed"
              value={formatCurrency(analytics.totalGymRevenueProcessed)}
              sub={<>This month: <span className="text-emerald-700 font-semibold">{formatCurrency(analytics.revenueThisMonth)}</span> <GrowthBadge current={analytics.revenueThisMonth} previous={analytics.revenueLastMonth} /></>}
              icon={<TrendingUp className="h-5 w-5 text-emerald-700" />}
              valueColor="text-emerald-800"
            />
            <StatCard
              label="New Gyms This Month"
              value={analytics.newGymsThisMonth}
              sub={<>Last month: {analytics.newGymsLastMonth} <GrowthBadge current={analytics.newGymsThisMonth} previous={analytics.newGymsLastMonth} /></>}
              icon={<UserPlus className="h-5 w-5 text-[#8B5E34]" />}
            />
            <StatCard
              label="Monthly Active Users"
              value={analytics.monthlyActiveUsers}
              sub={<>Out of {analytics.totalUsers} total accounts</>}
              icon={<Activity className="h-5 w-5 text-[#8B5E34]" />}
            />
            <StatCard
              label="Avg Revenue / Gym"
              value={formatCurrency(analytics.avgRevenuePerGym)}
              sub="Lifetime revenue ÷ active gyms"
              icon={<CircleDollarSign className="h-5 w-5 text-[#8B5E34]" />}
              valueColor="text-[#8B5E34]"
            />
            <StatCard
              label="Paid SaaS Subscribers"
              value={analytics.paidSaaSGyms}
              sub={<>Free: {analytics.planDistribution.FREE || 0} · Paid: {analytics.paidSaaSGyms}</>}
              icon={<BadgeCheck className="h-5 w-5 text-emerald-700" />}
            />
          </div>

          {/* Gym Health Summary + Activity Feed side by side */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Health Summary */}
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <h3 className="flex items-center gap-2 text-sm font-bold font-display text-[#33281E] mb-4">
                <HeartPulse className="h-4 w-4 text-[#8B5E34]" />
                Gym Health Overview
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50/70 border border-emerald-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-600" />
                    <span className="text-xs text-emerald-900 font-semibold">Healthy</span>
                  </div>
                  <span className="text-lg font-bold font-display text-emerald-800">{analytics.healthyGyms}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-amber-50/70 border border-amber-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-xs text-amber-900 font-semibold">At Risk</span>
                  </div>
                  <span className="text-lg font-bold font-display text-amber-800">{analytics.atRiskGyms}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-red-50/70 border border-red-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-xs text-red-900 font-semibold">Inactive</span>
                  </div>
                  <span className="text-lg font-bold font-display text-red-800">{analytics.inactiveGyms}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)] lg:col-span-2">
              <h3 className="flex items-center gap-2 text-sm font-bold font-display text-[#33281E] mb-4">
                <Zap className="h-4 w-4 text-[#8B5E34]" />
                Recent Activity
              </h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin">
                {recentActivity.length === 0 ? (
                  <p className="text-xs text-[#8C7A6B] text-center py-8">No recent activity</p>
                ) : (
                  recentActivity.slice(0, 15).map((a, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#F9F8F6] transition">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        a.type === "payment" ? "bg-emerald-100 text-emerald-800" :
                        a.type === "gym_registered" ? "bg-amber-100 text-[#8B5E34]" :
                        "bg-[#F3EFEA] text-[#33281E]"
                      }`}>
                        {a.type === "payment" ? <IndianRupee className="h-3.5 w-3.5" /> :
                         a.type === "gym_registered" ? <Building2 className="h-3.5 w-3.5" /> :
                         <UserPlus className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#33281E] font-medium truncate">{a.label}</p>
                        {a.detail && <p className="text-[10px] text-emerald-700 font-semibold">{a.detail}</p>}
                      </div>
                      <span className="text-[10px] text-[#8C7A6B] font-mono shrink-0">
                        {new Date(a.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Platform Announcements */}
          <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-bold font-display text-[#33281E]">
                <Megaphone className="h-4 w-4 text-[#8B5E34]" />
                Platform Announcements
              </h3>
              <button
                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5D9C5] bg-[#F9F8F6] px-4 py-1.5 text-xs font-semibold text-[#8B5E34] transition hover:bg-[#F3EFEA] cursor-pointer"
              >
                <Send className="h-3 w-3" />
                {showAnnouncementForm ? "Cancel" : "Broadcast"}
              </button>
            </div>

            {showAnnouncementForm && (
              <div className="mb-4 rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Announcement title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-4 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/50 outline-none focus:border-[#8B5E34]"
                />
                <textarea
                  placeholder="Announcement message..."
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm((f) => ({ ...f, content: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-[#E5D9C5] bg-white px-4 py-3 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/50 outline-none focus:border-[#8B5E34] resize-none"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm((f) => ({ ...f, priority: e.target.value }))}
                    className="h-9 rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none"
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <select
                    value={announcementForm.expiresInDays}
                    onChange={(e) => setAnnouncementForm((f) => ({ ...f, expiresInDays: parseInt(e.target.value) }))}
                    className="h-9 rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none"
                  >
                    <option value={3}>Expires in 3 days</option>
                    <option value={7}>Expires in 7 days</option>
                    <option value={14}>Expires in 14 days</option>
                    <option value={30}>Expires in 30 days</option>
                  </select>
                  <Button
                    size="sm"
                    disabled={isPending || !announcementForm.title.trim()}
                    onClick={handleCreateAnnouncement}
                    className="h-9 btn-primary text-xs font-semibold"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Broadcast to All Gyms
                  </Button>
                </div>
              </div>
            )}

            {announcements.length === 0 ? (
              <p className="text-xs text-[#8C7A6B] text-center py-4">No active announcements</p>
            ) : (
              <div className="space-y-2">
                {announcements.slice(0, 5).map((a) => (
                  <div key={a.id} className={`flex items-start gap-3 rounded-2xl px-4 py-3 border ${
                    a.priority === "URGENT" ? "border-red-200 bg-red-50/60" :
                    a.priority === "HIGH" ? "border-amber-200 bg-amber-50/60" :
                    "border-[#E5D9C5] bg-[#F9F8F6]"
                  }`}>
                    <Megaphone className={`h-4 w-4 mt-0.5 shrink-0 ${
                      a.priority === "URGENT" ? "text-red-600" :
                      a.priority === "HIGH" ? "text-[#8B5E34]" :
                      "text-[#8C7A6B]"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#33281E]">{a.title}</p>
                      <p className="text-[11px] text-[#8C7A6B] mt-0.5 line-clamp-2">{a.content}</p>
                    </div>
                    <Badge variant={a.priority === "URGENT" ? "destructive" : a.priority === "HIGH" ? "warning" : "secondary"} className="text-[9px] shrink-0">
                      {a.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB 2: REVENUE & ANALYTICS
         ════════════════════════════════════════════════════ */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          {/* Revenue Period Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <p className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">Today&apos;s Revenue</p>
              <p className="mt-2 font-display text-2xl font-bold text-emerald-800">{formatCurrency(analytics.revenueToday)}</p>
            </div>
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <p className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">This Week</p>
              <p className="mt-2 font-display text-2xl font-bold text-[#8B5E34]">{formatCurrency(analytics.revenueThisWeek)}</p>
            </div>
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">This Month</p>
                <GrowthBadge current={analytics.revenueThisMonth} previous={analytics.revenueLastMonth} />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-[#33281E]">{formatCurrency(analytics.revenueThisMonth)}</p>
            </div>
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <p className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">SaaS MRR</p>
              <p className="mt-2 font-display text-2xl font-bold text-[#8B5E34]">{formatCurrency(analytics.totalSaaSMonthlyRevenue)}</p>
              <p className="text-[10px] text-[#8C7A6B] mt-1">{analytics.paidSaaSGyms} paying subscriber{analytics.paidSaaSGyms !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Revenue Trend */}
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <h3 className="flex items-center gap-2 text-sm font-bold font-display text-[#33281E] mb-4">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
                Revenue Trend (6 Months)
              </h3>
              <LineChartSVG
                data={analytics.monthlyTrend as unknown as Record<string, unknown>[]}
                valueKey="revenue"
                labelKey="month"
                color="#8B5E34"
              />
            </div>

            {/* Member Growth Trend */}
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <h3 className="flex items-center gap-2 text-sm font-bold font-display text-[#33281E] mb-4">
                <UserPlus className="h-4 w-4 text-[#8B5E34]" />
                New Member Signups (6 Months)
              </h3>
              <BarChartSVG
                data={analytics.monthlyTrend as unknown as Record<string, unknown>[]}
                valueKey="members"
                labelKey="month"
                color="#B08D4A"
              />
            </div>
          </div>

          {/* Revenue by Gym + Plan Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Gyms by Revenue */}
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <h3 className="flex items-center gap-2 text-sm font-bold font-display text-[#33281E] mb-4">
                <BarChart3 className="h-4 w-4 text-[#8B5E34]" />
                Revenue by Gym (Top 10)
              </h3>
              {analytics.gymRevenueRanking.length === 0 ? (
                <p className="text-xs text-[#8C7A6B] text-center py-8">No revenue data yet</p>
              ) : (
                <BarChartSVG
                  data={analytics.gymRevenueRanking as unknown as Record<string, unknown>[]}
                  valueKey="revenue"
                  labelKey="name"
                  color="#8B5E34"
                />
              )}
            </div>

            {/* SaaS Plan Distribution Donut */}
            <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
              <h3 className="flex items-center gap-2 text-sm font-bold font-display text-[#33281E] mb-4">
                <PieChart className="h-4 w-4 text-[#8B5E34]" />
                SaaS Plan Distribution
              </h3>
              <div className="flex items-center justify-center py-4">
                <DonutChartSVG
                  data={[
                    { label: "Free", value: analytics.planDistribution.FREE || 0 },
                    { label: "Starter (₹1,499)", value: analytics.planDistribution.STARTER || 0 },
                    { label: "Pro (₹3,499)", value: analytics.planDistribution.PRO || 0 },
                    { label: "Business (₹7,999)", value: analytics.planDistribution.BUSINESS || 0 },
                  ]}
                  colors={["#8C7A6B", "#B08D4A", "#8B5E34", "#5C3E21"]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB 3: GYMS DIRECTORY
         ════════════════════════════════════════════════════ */}
      {activeTab === "gyms" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8C7A6B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gym name, code, owner..."
                className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white pl-9 pr-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/50 outline-none transition focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Gyms Table */}
          <div className="rounded-3xl overflow-hidden border border-[#E5D9C5] bg-white shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5D9C5] bg-[#F9F8F6] text-left text-[10px] uppercase font-bold text-[#8C7A6B]">
                    <th className="py-4 px-4">Health</th>
                    <th className="py-4 px-3">Gym / Workspace</th>
                    <th className="py-4 px-3">Owner</th>
                    <th className="py-4 px-3 text-center">Members</th>
                    <th className="py-4 px-3 text-center">Trainers</th>
                    <th className="py-4 px-3">Revenue</th>
                    <th className="py-4 px-3">SaaS Tier</th>
                    <th className="py-4 px-3">Status</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D9C5]">
                  {filteredGyms.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-[#8C7A6B]">
                        No gym records matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredGyms.map((g) => (
                      <Fragment key={g.id}>
                        <tr className="transition hover:bg-[#FAF9F7] cursor-pointer" onClick={() => setExpandedGym(expandedGym === g.id ? null : g.id)}>
                          <td className="py-4 px-4">
                            <HealthDot status={g.healthStatus} />
                          </td>
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5E34] font-display text-xs font-bold text-white shadow-sm">
                                {getInitials(g.name)}
                              </div>
                              <div>
                                <p className="font-semibold text-[#33281E] text-xs">{g.name}</p>
                                <p className="font-mono text-[10px] text-[#8B5E34] font-semibold">{g.gymCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-xs">
                            <p className="font-semibold text-[#33281E]">{g.owner.name}</p>
                            <p className="text-[10px] text-[#8C7A6B]">{g.owner.email}</p>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="font-semibold text-[#33281E] text-xs">{g._count.members}</span>
                            {g.newMembersThisMonth > 0 && (
                              <span className="text-[10px] text-emerald-700 font-semibold ml-1">+{g.newMembersThisMonth}</span>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center text-xs font-semibold text-[#33281E]">{g._count.trainers}</td>
                          <td className="py-4 px-3">
                            <p className="text-xs font-bold text-emerald-800 font-display">{formatCurrency(g.totalRevenue)}</p>
                            {g.thisMonthRevenue > 0 && (
                              <p className="text-[10px] text-[#8C7A6B]">This mo: {formatCurrency(g.thisMonthRevenue)}</p>
                            )}
                          </td>
                          <td className="py-4 px-3">
                            <select
                              disabled={isPending}
                              value={g.subscription?.plan || "FREE"}
                              onChange={(e) => {
                                e.stopPropagation();
                                handlePlanChange(g.id, e.target.value as SubscriptionPlan);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-[#E5D9C5] bg-[#F9F8F6] px-2 py-1 text-[10px] font-semibold text-[#8B5E34] outline-none hover:bg-white cursor-pointer"
                            >
                              <option value="FREE">FREE (₹0)</option>
                              <option value="STARTER">STARTER (₹1,499/mo)</option>
                              <option value="PRO">PRO (₹3,499/mo)</option>
                              <option value="BUSINESS">BUSINESS (₹7,999/mo)</option>
                            </select>
                          </td>
                          <td className="py-4 px-3">
                            <Badge
                              variant={g.status === "ACTIVE" ? "success" : g.status === "PENDING_APPROVAL" ? "warning" : "destructive"}
                              className="text-[10px]"
                            >
                              {g.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant={g.status === "ACTIVE" ? "destructive" : "secondary"}
                                disabled={isPending}
                                onClick={() => handleStatusToggle(g.id, g.status)}
                                className="h-7 text-[10px]"
                              >
                                {g.status === "ACTIVE" ? "Suspend" : "Activate"}
                              </Button>
                              <button
                                onClick={() => setExpandedGym(expandedGym === g.id ? null : g.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5D9C5] bg-[#F9F8F6] text-[#8C7A6B] hover:bg-white transition cursor-pointer"
                              >
                                {expandedGym === g.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row — Gym Deep Dive */}
                        {expandedGym === g.id && (
                          <tr key={`${g.id}-expanded`}>
                            <td colSpan={9} className="bg-[#FAF9F7] px-6 py-5 border-b border-[#E5D9C5]">
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                <MiniStat label="Lifetime Revenue" value={formatCurrency(g.totalRevenue)} color="text-emerald-800" />
                                <MiniStat
                                  label="This Month vs Last"
                                  value={`${formatCurrency(g.thisMonthRevenue)} vs ${formatCurrency(g.lastMonthRevenue)}`}
                                  color="text-[#8B5E34]"
                                  extra={<GrowthBadge current={g.thisMonthRevenue} previous={g.lastMonthRevenue} />}
                                />
                                <MiniStat label="Active / Total Members" value={`${g.activeMembers} / ${g.totalMembers}`} color="text-[#33281E]" />
                                <MiniStat label="Avg Revenue / Member" value={formatCurrency(g.avgRevenuePerMember)} color="text-[#8B5E34]" />
                                <MiniStat
                                  label="Owner Last Login"
                                  value={g.daysSinceOwnerLogin < 999 ? `${g.daysSinceOwnerLogin}d ago` : "Never"}
                                  color={g.daysSinceOwnerLogin > 30 ? "text-red-600" : "text-[#33281E]"}
                                />
                              </div>
                              {g.lastPaymentDate && (
                                <p className="mt-3 text-[10px] text-[#8C7A6B]">
                                  Last payment: {formatDate(g.lastPaymentDate)} · {g._count.attendance} total check-ins · {g.city ? `${g.city}, ${g.state}` : "Location not set"}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB 4: USERS & SECURITY
         ════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8C7A6B]" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white pl-9 pr-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/50 outline-none transition focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="h-10 rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="GYM_OWNER">Gym Owners</option>
              <option value="TRAINER">Trainers</option>
              <option value="CUSTOMER">Members</option>
              <option value="RECEPTIONIST">Receptionist</option>
            </select>
            <div className="text-xs text-[#8C7A6B]">
              Showing {filteredUsers.length} of {recentUsers.length} users
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-3xl overflow-hidden border border-[#E5D9C5] bg-white shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5D9C5] bg-[#F9F8F6] text-left text-[10px] uppercase font-bold text-[#8C7A6B]">
                    <th className="py-4 px-4">User</th>
                    <th className="py-4 px-3">Email</th>
                    <th className="py-4 px-3">Role</th>
                    <th className="py-4 px-3">Status</th>
                    <th className="py-4 px-3">Last Login</th>
                    <th className="py-4 px-3">Joined</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D9C5]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="transition hover:bg-[#FAF9F7]">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8B5E34] text-[10px] font-bold text-white">
                            {getInitials(u.name)}
                          </div>
                          <span className="font-semibold text-[#33281E] text-xs">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-xs text-[#8C7A6B]">{u.email}</td>
                      <td className="py-4 px-3">
                        <Badge
                          variant={
                            u.role === "SUPER_ADMIN" ? "warning" :
                            u.role === "GYM_OWNER" ? "default" :
                            u.role === "TRAINER" ? "info" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-3">
                        <Badge
                          variant={u.status === "ACTIVE" ? "success" : u.status === "SUSPENDED" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-3 text-xs text-[#8C7A6B]">
                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : <span className="text-gray-400">Never</span>}
                      </td>
                      <td className="py-4 px-3 text-xs text-[#8C7A6B]">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.role !== "SUPER_ADMIN" && (
                            <>
                              <Button
                                size="sm"
                                variant={u.status === "ACTIVE" ? "destructive" : "secondary"}
                                disabled={isPending}
                                onClick={() => handleUserStatusToggle(u.id, u.status)}
                                className="h-7 text-[10px]"
                              >
                                {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                              </Button>
                              <button
                                disabled={isPending}
                                onClick={() => handleForcePasswordReset(u.id, u.name)}
                                title="Force password reset"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5D9C5] bg-[#F9F8F6] text-[#8B5E34] hover:bg-[#F3EFEA] transition disabled:opacity-50 cursor-pointer"
                              >
                                <KeyRound className="h-3 w-3" />
                              </button>
                            </>
                          )}
                          {u.role === "SUPER_ADMIN" && (
                            <span className="text-[10px] text-[#8B5E34] font-semibold italic">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  borderColor = "hover:border-[#8B5E34]",
  valueColor = "text-[#33281E]",
}: {
  label: string;
  value: string | number;
  sub: React.ReactNode;
  icon: React.ReactNode;
  borderColor?: string;
  valueColor?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 border border-[#E5D9C5] bg-white shadow-[0_4px_20px_rgba(51,40,30,0.03)] transition ${borderColor} hover:shadow-[0_8px_24px_rgba(51,40,30,0.06)]`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8C7A6B] font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[10px] text-[#8C7A6B] leading-relaxed">{sub}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color = "text-[#33281E]",
  extra,
}: {
  label: string;
  value: string;
  color?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-4 py-3">
      <p className="text-[10px] text-[#8C7A6B] font-medium mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}
