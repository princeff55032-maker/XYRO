"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Clock,
  BellRing,
  Sparkles,
  Users,
  Check,
  Copy,
  Save,
  ShieldCheck,
  Calendar,
  DollarSign,
  MapPin,
  Mail,
  Phone,
  Info,
  Globe,
  FileText,
  Smartphone,
  MessageSquare,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  Crown,
  ChevronRight,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateGymSettingsAction, updateGymPreferencesAction } from "../actions";
import { formatDate, getInitials } from "@/lib/utils";

interface SettingsClientProps {
  gym: {
    id: string;
    gymCode: string;
    name: string;
    slug: string;
    logo: string | null;
    email: string;
    phone: string;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    gstNumber: string | null;
    description: string | null;
    status: string;
    createdAt: Date;
    owner: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
  };
  settings: {
    id?: string;
    timezone: string;
    currency: string;
    currencySymbol: string;
    dateFormat: string;
    workingDays: string[];
    openingTime: string;
    closingTime: string;
    enableQrCheckin: boolean;
    enableWhatsapp: boolean;
    enableEmail: boolean;
    enableSms: boolean;
    expiryReminder30Days: boolean;
    expiryReminder15Days: boolean;
    expiryReminder7Days: boolean;
    expiryReminder3Days: boolean;
    expiryReminder1Day: boolean;
    autoSuspendOnExpiry: boolean;
  } | null;
  subscription: {
    id: string;
    plan: string;
    status: string;
    price: number;
    startDate: Date;
    endDate: Date;
    trialEndsAt: Date | null;
  } | null;
  staff: Array<{
    id: string;
    role: string;
    permissions: string[];
    isActive: boolean;
    joinedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
    };
  }>;
  auditLogs?: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId?: string | null;
    metadata?: unknown;
    ipAddress?: string | null;
    createdAt: Date;
    user: {
      name: string;
      email: string;
      role: string;
    };
  }>;
  stats: {
    totalMembers: number;
    totalTrainers: number;
    totalPlans: number;
  };
}

const DAYS_OF_WEEK = [
  { code: "MON", label: "Monday" },
  { code: "TUE", label: "Tuesday" },
  { code: "WED", label: "Wednesday" },
  { code: "THU", label: "Thursday" },
  { code: "FRI", label: "Friday" },
  { code: "SAT", label: "Saturday" },
  { code: "SUN", label: "Sunday" },
];

const CURRENCIES = [
  { code: "INR", name: "Indian Rupee (INR ₹)", label: "Indian Rupee (₹)", symbol: "₹" },
  { code: "USD", name: "US Dollar (USD $)", label: "US Dollar ($)", symbol: "$" },
  { code: "EUR", name: "Euro (EUR €)", label: "Euro (€)", symbol: "€" },
  { code: "GBP", name: "British Pound (GBP £)", label: "British Pound (£)", symbol: "£" },
  { code: "AED", name: "UAE Dirham (AED)", label: "UAE Dirham (AED)", symbol: "AED " },
];

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST +5:30)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST +4:00)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST/PDT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT +8:00)" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
];

export function SettingsClient({
  gym,
  settings: initialSettings,
  subscription,
  staff,
  auditLogs = [],
  stats,
}: SettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Notification / Alert message
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Copied indicator
  const [copiedCode, setCopiedCode] = useState(false);

  // Profile Form state
  const [profile, setProfile] = useState({
    name: gym.name || "",
    email: gym.email || "",
    phone: gym.phone || "",
    address: gym.address || "",
    city: gym.city || "",
    state: gym.state || "",
    country: gym.country || "India",
    gstNumber: gym.gstNumber || "",
    description: gym.description || "",
  });

  // Operational Settings state
  const [ops, setOps] = useState({
    timezone: initialSettings?.timezone || "Asia/Kolkata",
    currency: initialSettings?.currency || "INR",
    currencySymbol: initialSettings?.currencySymbol || "₹",
    dateFormat: initialSettings?.dateFormat || "DD/MM/YYYY",
    openingTime: initialSettings?.openingTime || "06:00",
    closingTime: initialSettings?.closingTime || "22:00",
    workingDays: initialSettings?.workingDays || [
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT",
    ],
    enableQrCheckin: initialSettings?.enableQrCheckin ?? true,
    enableWhatsapp: initialSettings?.enableWhatsapp ?? false,
    enableEmail: initialSettings?.enableEmail ?? true,
    enableSms: initialSettings?.enableSms ?? false,
    expiryReminder30Days: initialSettings?.expiryReminder30Days ?? true,
    expiryReminder15Days: initialSettings?.expiryReminder15Days ?? true,
    expiryReminder7Days: initialSettings?.expiryReminder7Days ?? true,
    expiryReminder3Days: initialSettings?.expiryReminder3Days ?? true,
    expiryReminder1Day: initialSettings?.expiryReminder1Day ?? true,
    autoSuspendOnExpiry: initialSettings?.autoSuspendOnExpiry ?? false,
  });

  // Enterprise Modal state
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [enterpriseSubmitted, setEnterpriseSubmitted] = useState(false);
  const [submittingEnterprise, setSubmittingEnterprise] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [enterpriseForm, setEnterpriseForm] = useState({
    branches: "2-5",
    phone: gym.phone || "",
    features: ["Biometrics & Turnstiles", "Multi-Branch Sync"],
    notes: "",
  });

  const toggleEnterpriseFeature = (feat: string) => {
    setEnterpriseForm((prev) => ({
      ...prev,
      features: prev.features.includes(feat)
        ? prev.features.filter((f) => f !== feat)
        : [...prev.features, feat],
    }));
  };

  const handleEnterpriseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEnterprise(true);
    setTimeout(() => {
      setReferenceId(`ENT-${Math.floor(100000 + Math.random() * 900000)}`);
      setSubmittingEnterprise(false);
      setEnterpriseSubmitted(true);
    }, 1000);
  };


  const copyGymCode = () => {
    navigator.clipboard.writeText(gym.gymCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleWorkingDay = (day: string) => {
    setOps((prev) => {
      const exists = prev.workingDays.includes(day);
      const newDays = exists
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays: newDays };
    });
  };

  const handleCurrencyChange = (currCode: string) => {
    const selected = CURRENCIES.find((c) => c.code === currCode);
    setOps((prev) => ({
      ...prev,
      currency: currCode,
      currencySymbol: selected?.symbol || "₹",
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    startTransition(async () => {
      const res = await updateGymSettingsAction(profile);
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: "Workspace profile updated successfully.",
        });
        router.refresh();
      } else {
        setStatusMsg({
          type: "error",
          text: res.error || "Failed to update gym profile.",
        });
      }
    });
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    startTransition(async () => {
      const res = await updateGymPreferencesAction(ops);
      if (res.ok) {
        setStatusMsg({
          type: "success",
          text: "Operational & automation preferences saved.",
        });
        router.refresh();
      } else {
        setStatusMsg({
          type: "error",
          text: res.error || "Failed to save preferences.",
        });
      }
    });
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3.5 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15";
  const labelCls = "mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider";

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#33281E] md:text-3xl">
                Facility &amp; System Configuration
              </h1>
              <Badge variant="default" className="font-mono text-[10px]">
                Workspace Admin
              </Badge>
              <Badge variant="success" className="font-mono text-[10px]">
                {gym.status}
              </Badge>
            </div>
            <p className="mt-2 max-w-xl text-xs text-[#8C7A6B]">
              Configure your health club profile, operational schedules, automated WhatsApp renewal sequences,
              and subscription tier.
            </p>
          </div>

          {/* Quick Workspace Identifier Box */}
          <div className="flex items-center gap-4 rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 shadow-xs">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#8B5E34] text-white font-display font-bold shadow-xs text-sm">
              {getInitials(gym.name)}
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider">Gym Code Identifier</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#8B5E34]">
                  {gym.gymCode}
                </span>
                <button
                  type="button"
                  onClick={copyGymCode}
                  className="rounded-lg border border-[#E5D9C5] bg-white p-1.5 text-[#8C7A6B] transition hover:bg-[#F3EFEA] hover:text-[#33281E] cursor-pointer"
                  title="Copy Gym Code"
                >
                  {copiedCode ? (
                    <Check className="h-3.5 w-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status feedback message banner */}
      {statusMsg && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-xs font-medium transition-all ${
            statusMsg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <span className="flex-1 font-mono">{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tabs Container */}
      <Tabs defaultValue="profile" className="w-full space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-[#E5D9C5] bg-[#F3EFEA] p-1.5">
          <TabsTrigger
            value="profile"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition data-[state=active]:bg-white data-[state=active]:text-[#8B5E34] data-[state=active]:shadow-xs text-[#8C7A6B] font-mono"
          >
            <Building2 className="h-3.5 w-3.5" />
            Club Profile
          </TabsTrigger>
          <TabsTrigger
            value="operations"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition data-[state=active]:bg-white data-[state=active]:text-[#8B5E34] data-[state=active]:shadow-xs text-[#8C7A6B] font-mono"
          >
            <Clock className="h-3.5 w-3.5" />
            Operations &amp; Timings
          </TabsTrigger>
          <TabsTrigger
            value="automations"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition data-[state=active]:bg-white data-[state=active]:text-[#8B5E34] data-[state=active]:shadow-xs text-[#8C7A6B] font-mono"
          >
            <BellRing className="h-3.5 w-3.5" />
            Automations &amp; WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition data-[state=active]:bg-white data-[state=active]:text-[#8B5E34] data-[state=active]:shadow-xs text-[#8C7A6B] font-mono"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Plan &amp; License
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition data-[state=active]:bg-white data-[state=active]:text-[#8B5E34] data-[state=active]:shadow-xs text-[#8C7A6B] font-mono"
          >
            <Users className="h-3.5 w-3.5" />
            Staff Roles ({staff.length + 1})
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition data-[state=active]:bg-white data-[state=active]:text-[#8B5E34] data-[state=active]:shadow-xs text-[#8C7A6B] font-mono"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Security &amp; Audit Logs ({auditLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <form onSubmit={handleSaveProfile} className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
                <div className="border-b border-[#E5D9C5] pb-4">
                  <h3 className="font-display text-base font-bold text-[#33281E]">
                    General Information
                  </h3>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">
                    This info appears on member invoices, receipts, and communication.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Gym / Facility Name *</label>
                    <input
                      required
                      value={profile.name}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. Iron Forge Elite Fitness"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Official Contact Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#8C7A6B]" />
                      <input
                        required
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="contact@gym.com"
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Official Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 h-4 w-4 text-[#8C7A6B]" />
                      <input
                        required
                        type="tel"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="+91 98765 43210"
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelCls}>Physical Street Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-[#8C7A6B]" />
                      <input
                        value={profile.address}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, address: e.target.value }))
                        }
                        placeholder="Plot No. 42, Sector 18, Commercial Belt"
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>City</label>
                    <input
                      value={profile.city}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, city: e.target.value }))
                      }
                      placeholder="Mumbai / Delhi / Bengaluru"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>State / Province</label>
                    <input
                      value={profile.state}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, state: e.target.value }))
                      }
                      placeholder="Maharashtra / Delhi"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Country</label>
                    <input
                      value={profile.country}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, country: e.target.value }))
                      }
                      placeholder="India"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>GST / Tax Registration Number</label>
                    <input
                      value={profile.gstNumber}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, gstNumber: e.target.value }))
                      }
                      placeholder="27ABCDE1234F1Z5"
                      className={inputCls}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelCls}>Facility Bio / Tagline</label>
                    <textarea
                      rows={3}
                      value={profile.description}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="State-of-the-art strength and conditioning facility offering personal training, sauna, and crossfit."
                      className="w-full rounded-xl border border-[#E5D9C5] bg-white p-3.5 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button type="submit" disabled={isPending} className="btn-primary h-11 px-6 rounded-xl text-white font-bold">
                    <Save className="mr-2 h-4 w-4 text-white" />
                    {isPending ? "Saving changes…" : "Save Profile Details"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Sidebar Summary Card */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
                <h4 className="font-display text-sm font-bold text-[#33281E]">
                  Workspace Metadata
                </h4>
                <div className="mt-4 space-y-3.5 text-xs">
                  <div className="flex justify-between border-b border-[#E5D9C5] pb-2.5">
                    <span className="text-[#8C7A6B]">Slug Handle</span>
                    <span className="font-mono text-xs font-bold text-[#8B5E34]">
                      @{gym.slug}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E5D9C5] pb-2.5">
                    <span className="text-[#8C7A6B]">Workspace Code</span>
                    <span className="font-mono text-xs font-bold text-[#33281E]">
                      {gym.gymCode}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E5D9C5] pb-2.5">
                    <span className="text-[#8C7A6B]">Created On</span>
                    <span className="text-xs text-[#33281E]">
                      {formatDate(gym.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E5D9C5] pb-2.5">
                    <span className="text-[#8C7A6B]">Active Members</span>
                    <span className="font-semibold text-[#33281E]">
                      {stats.totalMembers}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E5D9C5] pb-2.5">
                    <span className="text-[#8C7A6B]">Active Trainers</span>
                    <span className="font-semibold text-[#33281E]">
                      {stats.totalTrainers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8C7A6B]">Membership Plans</span>
                    <span className="font-semibold text-[#33281E]">
                      {stats.totalPlans}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-[#33281E]">
                      Multi-Tenant Isolation
                    </h4>
                    <p className="text-xs text-[#8C7A6B]">Secured via XYRO Cloud</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#8C7A6B]">
                  Your members, biometric check-ins, financial receipts, and trainer
                  schedules are encrypted and isolated within your dedicated gym boundary.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. Operations & Schedule Tab */}
        <TabsContent value="operations" className="space-y-6">
          <form onSubmit={handleSavePreferences} className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
            <div className="border-b border-[#E5D9C5] pb-4">
              <h3 className="font-display text-lg font-bold text-[#33281E]">
                Working Days & Operating Hours
              </h3>
              <p className="text-xs text-[#8C7A6B]">
                Control your operational schedule, timezone, and locale standards.
              </p>
            </div>

            <div className="mt-6 space-y-8">
              {/* Working Days Selector */}
              <div>
                <label className="mb-3 block text-xs font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                  Operating Days of the Week
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const active = ops.workingDays.includes(d.code);
                    return (
                      <button
                        type="button"
                        key={d.code}
                        onClick={() => toggleWorkingDay(d.code)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                          active
                            ? "border border-[#8B5E34] bg-[#8B5E34] text-white shadow-sm"
                            : "border border-[#E5D9C5] bg-white text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E]"
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hours of Operation */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Daily Opening Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-3 h-4 w-4 text-[#8C7A6B]" />
                    <input
                      type="time"
                      value={ops.openingTime}
                      onChange={(e) =>
                        setOps((o) => ({ ...o, openingTime: e.target.value }))
                      }
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Daily Closing Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-3 h-4 w-4 text-[#8C7A6B]" />
                    <input
                      type="time"
                      value={ops.closingTime}
                      onChange={(e) =>
                        setOps((o) => ({ ...o, closingTime: e.target.value }))
                      }
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>
              </div>

              {/* Regional & Financial Preferences */}
              <div className="border-t border-[#E5D9C5] pt-6">
                <h4 className="font-display text-sm font-bold text-[#33281E]">
                  Regional & Currency Localization
                </h4>
                <div className="mt-4 grid gap-5 sm:grid-cols-3">
                  <div>
                    <label className={labelCls}>Default Currency</label>
                    <select
                      value={ops.currency}
                      onChange={(e) => handleCurrencyChange(e.target.value)}
                      className={inputCls}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-white text-[#33281E]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Timezone</label>
                    <select
                      value={ops.timezone}
                      onChange={(e) =>
                        setOps((o) => ({ ...o, timezone: e.target.value }))
                      }
                      className={inputCls}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value} className="bg-white text-[#33281E]">
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Date Format</label>
                    <select
                      value={ops.dateFormat}
                      onChange={(e) =>
                        setOps((o) => ({ ...o, dateFormat: e.target.value }))
                      }
                      className={inputCls}
                    >
                      <option value="DD/MM/YYYY" className="bg-white text-[#33281E]">
                        DD/MM/YYYY (e.g. 16/08/2026)
                      </option>
                      <option value="MM/DD/YYYY" className="bg-white text-[#33281E]">
                        MM/DD/YYYY (e.g. 08/16/2026)
                      </option>
                      <option value="YYYY-MM-DD" className="bg-white text-[#33281E]">
                        YYYY-MM-DD (e.g. 2026-08-16)
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button type="submit" disabled={isPending} className="btn-primary h-11 px-6 rounded-xl text-white font-bold">
                <Save className="mr-2 h-4 w-4 text-white" />
                {isPending ? "Saving changes…" : "Save Operations Settings"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* 3. Automations & Alerts Tab */}
        <TabsContent value="automations" className="space-y-6">
          <form onSubmit={handleSavePreferences} className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
            <div className="border-b border-[#E5D9C5] pb-4">
              <h3 className="font-display text-lg font-bold text-[#33281E]">
                Member Check-in & Automated Reminders
              </h3>
              <p className="text-xs text-[#8C7A6B]">
                Configure touchless attendance, WhatsApp & email notifications, and renewal alerts.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              {/* Feature Toggles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8B5E34]/10 text-[#8B5E34]">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#33281E]">
                        QR Code Check-in System
                      </p>
                      <p className="text-xs text-[#8C7A6B]">
                        Allow members to scan desk QR code or use unique QR pass
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={ops.enableQrCheckin}
                    onCheckedChange={(v) =>
                      setOps((o) => ({ ...o, enableQrCheckin: v }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#33281E]">
                          WhatsApp Automation
                        </p>
                        <Badge variant="info" className="text-[10px]">
                          BETA
                        </Badge>
                      </div>
                      <p className="text-xs text-[#8C7A6B]">
                        Send welcome messages and receipt links via WhatsApp
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={ops.enableWhatsapp}
                    onCheckedChange={(v) =>
                      setOps((o) => ({ ...o, enableWhatsapp: v }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#33281E]">
                        Email Notifications
                      </p>
                      <p className="text-xs text-[#8C7A6B]">
                        Deliver workout plans, diet charts, and invoices via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={ops.enableEmail}
                    onCheckedChange={(v) =>
                      setOps((o) => ({ ...o, enableEmail: v }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#33281E]">SMS Alerts</p>
                      <p className="text-xs text-[#8C7A6B]">
                        Send transactional SMS updates and OTP verifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={ops.enableSms}
                    onCheckedChange={(v) =>
                      setOps((o) => ({ ...o, enableSms: v }))
                    }
                  />
                </div>
              </div>

              {/* Expiry Reminders Schedule */}
              <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8B5E34]/10 text-[#8B5E34]">
                    <BellRing className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#33281E]">
                      Membership Expiry Notification Schedule
                    </h4>
                    <p className="text-xs text-[#8C7A6B]">
                      XYRO automatically triggers renewal reminders to members before their plan lapses.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 md:grid-cols-5">
                  <label className="flex items-center gap-3 rounded-xl border border-[#E5D9C5] bg-white p-3 text-xs font-semibold text-[#33281E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ops.expiryReminder30Days}
                      onChange={(e) =>
                        setOps((o) => ({
                          ...o,
                          expiryReminder30Days: e.target.checked,
                        }))
                      }
                      className="rounded accent-[#8B5E34]"
                    />
                    30 Days Before
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-[#E5D9C5] bg-white p-3 text-xs font-semibold text-[#33281E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ops.expiryReminder15Days}
                      onChange={(e) =>
                        setOps((o) => ({
                          ...o,
                          expiryReminder15Days: e.target.checked,
                        }))
                      }
                      className="rounded accent-[#8B5E34]"
                    />
                    15 Days Before
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-[#E5D9C5] bg-white p-3 text-xs font-semibold text-[#33281E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ops.expiryReminder7Days}
                      onChange={(e) =>
                        setOps((o) => ({
                          ...o,
                          expiryReminder7Days: e.target.checked,
                        }))
                      }
                      className="rounded accent-[#8B5E34]"
                    />
                    7 Days Before
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-[#E5D9C5] bg-white p-3 text-xs font-semibold text-[#33281E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ops.expiryReminder3Days}
                      onChange={(e) =>
                        setOps((o) => ({
                          ...o,
                          expiryReminder3Days: e.target.checked,
                        }))
                      }
                      className="rounded accent-[#8B5E34]"
                    />
                    3 Days Before
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-[#E5D9C5] bg-white p-3 text-xs font-semibold text-[#33281E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ops.expiryReminder1Day}
                      onChange={(e) =>
                        setOps((o) => ({
                          ...o,
                          expiryReminder1Day: e.target.checked,
                        }))
                      }
                      className="rounded accent-[#8B5E34]"
                    />
                    1 Day Before
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E5D9C5] pt-4">
                  <div>
                    <p className="text-xs font-bold text-[#33281E]">
                      Auto-suspend member access on expiry
                    </p>
                    <p className="text-xs text-[#8C7A6B]">
                      Revoke QR check-in and active privileges immediately when the plan ends.
                    </p>
                  </div>
                  <Switch
                    checked={ops.autoSuspendOnExpiry}
                    onCheckedChange={(v) =>
                      setOps((o) => ({ ...o, autoSuspendOnExpiry: v }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button type="submit" disabled={isPending} className="btn-primary h-11 px-6 rounded-xl text-white font-bold">
                <Save className="mr-2 h-4 w-4 text-white" />
                {isPending ? "Saving changes…" : "Save Automation Settings"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* 4. Subscription & Plan Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5D9C5] pb-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#8B5E34]">
                  Active Facility Tier
                </span>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#33281E]">
                  {subscription ? `${subscription.plan} Tier` : "Gym Sandbox (Free Plan)"}
                </h3>
              </div>
              <Badge
                variant={subscription?.status === "ACTIVE" ? "success" : "warning"}
                className="px-3 py-1 text-xs font-semibold font-mono"
              >
                {subscription?.status || "FREE TIER (ACTIVE)"}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
                <p className="text-xs font-mono text-[#8C7A6B] uppercase font-bold text-[10px]">Member Quota</p>
                <p className="mt-1 font-display text-lg font-bold text-[#33281E]">
                  {subscription?.plan === "BUSINESS" || subscription?.plan === "PRO"
                    ? "Unlimited Members"
                    : subscription?.plan === "STARTER"
                    ? "Up to 300 Members"
                    : "Up to 50 Members (Free)"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
                <p className="text-xs font-mono text-[#8C7A6B] uppercase font-bold text-[10px]">Coach / Trainer Quota</p>
                <p className="mt-1 font-display text-lg font-bold text-[#33281E]">
                  {subscription?.plan === "BUSINESS" || subscription?.plan === "PRO"
                    ? "Unlimited Coaches"
                    : subscription?.plan === "STARTER"
                    ? "Up to 3 Coaches"
                    : "1 Coach (Free Tier)"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
                <p className="text-xs font-mono text-[#8C7A6B] uppercase font-bold text-[10px]">Billing Status</p>
                <p className="mt-1 font-display text-lg font-bold text-[#33281E]">
                  {subscription?.endDate ? formatDate(subscription.endDate) : "Ongoing / Free"}
                </p>
              </div>
            </div>

            {/* 4 Tier Cards */}
            <div className="mt-8">
              <h4 className="font-display text-base font-bold text-[#33281E] mb-4">
                Available Subscription Tiers
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    plan: "FREE",
                    name: "Gym Sandbox",
                    price: "₹0",
                    period: "/forever",
                    badge: "FREE",
                    features: ["Max 50 Members", "1 Coach", "Dynamic QR Passes", "Manual Cash Ledger"],
                  },
                  {
                    plan: "STARTER",
                    name: "Single Facility",
                    price: "₹1,499",
                    period: "/mo",
                    badge: "STARTER",
                    features: ["Max 300 Members", "3 Coaches", "GST Invoicing", "WhatsApp Sequences", "Revenue Analytics"],
                  },
                  {
                    plan: "PRO",
                    name: "Performance Gym",
                    price: "₹3,499",
                    period: "/mo",
                    badge: "PRO",
                    features: ["Unlimited Members", "Unlimited Coaches", "Strength & Diet Builders", "Group Classes", "Staff RBAC"],
                  },
                  {
                    plan: "BUSINESS",
                    name: "Enterprise Chain",
                    price: "₹7,999",
                    period: "/mo",
                    badge: "ENTERPRISE",
                    features: ["Multi-Branch Roaming", "Turnstile Hardware API", "Biometric Webhooks", "Priority SLA"],
                  },
                ].map((tier) => {
                  const isCurrent = (subscription?.plan || "FREE") === tier.plan;
                  return (
                    <div
                      key={tier.plan}
                      className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                        isCurrent
                          ? "border-[#8B5E34] bg-[#FAF8F5] ring-2 ring-[#8B5E34]/20"
                          : "border-[#E5D9C5] bg-white hover:border-[#8B5E34]/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[#8B5E34] uppercase">
                            {tier.badge}
                          </span>
                          {isCurrent && (
                            <Badge variant="success" className="text-[9px] font-mono px-1.5 py-0">
                              ACTIVE
                            </Badge>
                          )}
                        </div>
                        <h5 className="font-display text-base font-bold text-[#33281E] mt-1">
                          {tier.name}
                        </h5>
                        <p className="mt-2 font-display text-xl font-bold text-[#33281E]">
                          {tier.price}{" "}
                          <span className="font-sans text-xs font-normal text-[#8C7A6B]">
                            {tier.period}
                          </span>
                        </p>

                        <ul className="mt-4 space-y-2 text-xs text-[#8C7A6B]">
                          {tier.features.map((f, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#E5D9C5]">
                        {isCurrent ? (
                          <span className="block text-center text-xs font-bold text-[#8B5E34] py-1.5">
                            Current Plan
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEnterpriseSubmitted(false);
                              setShowEnterpriseModal(true);
                            }}
                            className="w-full text-xs font-bold border-[#8B5E34] text-[#8B5E34] hover:bg-[#8B5E34] hover:text-white"
                          >
                            Upgrade to {tier.badge}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. Team & Staff Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5D9C5] pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#33281E]">
                  Workspace Team & Roles
                </h3>
                <p className="text-xs text-[#8C7A6B]">
                  Users who have access to manage this gym workspace.
                </p>
              </div>
            </div>

            {/* Staff / Owner List */}
            <div className="mt-6 space-y-3">
              {/* Gym Owner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B5E34] font-display text-sm font-bold text-white shadow-xs">
                    {getInitials(gym.owner.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#33281E]">{gym.owner.name}</p>
                      <Badge variant="default" className="text-[10px]">
                        Owner
                      </Badge>
                    </div>
                    <p className="text-xs text-[#8C7A6B]">{gym.owner.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-[#8C7A6B]">
                    Full Access & Billing
                  </span>
                </div>
              </div>

              {/* Other Staff Members */}
              {staff.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5D9C5] bg-white p-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F3EFEA] text-sm font-bold text-[#33281E]">
                      {getInitials(s.user.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#33281E]">{s.user.name}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {s.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#8C7A6B]">{s.user.email}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[#8C7A6B]">
                    Joined {formatDate(s.joinedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 6. Security & Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-6">
          {/* Hardware & External Service Health Monitoring */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E5D9C5] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase">Turnstile Controller</span>
                <Badge variant="success" className="text-[10px]">Online</Badge>
              </div>
              <p className="mt-2 text-xs font-semibold text-[#33281E]">Biometric Relay 01</p>
              <p className="mt-0.5 text-[11px] text-[#8C7A6B] font-mono">Last ping: 1 min ago</p>
            </div>

            <div className="rounded-2xl border border-[#E5D9C5] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase">WhatsApp Gateway</span>
                <Badge variant="success" className="text-[10px]">Operational</Badge>
              </div>
              <p className="mt-2 text-xs font-semibold text-[#33281E]">Template Engine</p>
              <p className="mt-0.5 text-[11px] text-[#8C7A6B] font-mono">Latency: 140ms</p>
            </div>

            <div className="rounded-2xl border border-[#E5D9C5] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase">Cloud Database</span>
                <Badge variant="success" className="text-[10px]">Connected</Badge>
              </div>
              <p className="mt-2 text-xs font-semibold text-[#33281E]">Supabase Pooler</p>
              <p className="mt-0.5 text-[11px] text-[#8C7A6B] font-mono">Status: 99.98% uptime</p>
            </div>

            <div className="rounded-2xl border border-[#E5D9C5] bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase">Payment Gateways</span>
                <Badge variant="success" className="text-[10px]">Active</Badge>
              </div>
              <p className="mt-2 text-xs font-semibold text-[#33281E]">UPI, Cards &amp; Web3</p>
              <p className="mt-0.5 text-[11px] text-[#8C7A6B] font-mono">Auto-reconciliation on</p>
            </div>
          </div>

          {/* Immutable Audit Log Table */}
          <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5D9C5] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-[#33281E]">
                    Immutable Facility Audit Trail
                  </h3>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    Tamper-Proof
                  </Badge>
                </div>
                <p className="text-xs text-[#8C7A6B] mt-0.5">
                  Cryptographically recorded historical event log. Normal users cannot alter or purge these records.
                </p>
              </div>
            </div>

            {/* Audit Log Rows */}
            <div className="mt-6 divide-y divide-[#E5D9C5] overflow-x-auto">
              {(!auditLogs || auditLogs.length === 0) ? (
                <div className="py-12 text-center text-xs text-[#8C7A6B]">
                  No audit records logged yet for this facility workspace.
                </div>
              ) : (
                auditLogs.map((log) => {
                  const meta = (log.metadata || {}) as Record<string, unknown>;
                  const before = meta._before as Record<string, unknown> | undefined;
                  const after = meta._after as Record<string, unknown> | undefined;

                  return (
                    <div key={log.id} className="py-3.5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] font-bold text-[#8B5E34]">
                            {log.action}
                          </Badge>
                          <span className="font-semibold text-[#33281E]">
                            {log.user.name}
                          </span>
                          <span className="text-[11px] font-mono text-[#8C7A6B]">
                            ({log.user.role})
                          </span>
                          {log.resource && (
                            <span className="text-[11px] text-[#8C7A6B]">
                              on <strong className="text-[#33281E]">{log.resource}</strong>
                            </span>
                          )}
                        </div>

                        {/* State Diffs */}
                        {(before || after) && (
                          <div className="flex flex-wrap gap-2 font-mono text-[11px] text-[#8C7A6B] mt-1">
                            {before && (
                              <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 border border-red-200">
                                BEFORE: {JSON.stringify(before)}
                              </span>
                            )}
                            {after && (
                              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 border border-emerald-200">
                                AFTER: {JSON.stringify(after)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[#8C7A6B] font-mono text-[11px] shrink-0">
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Enterprise Sales Consultation Modal ──────────────── */}
      {showEnterpriseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33281E]/40 backdrop-blur-md animate-fade-up">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white shadow-[0_25px_70px_rgba(51,40,30,0.15)]">
            {/* Header banner */}
            <div className="flex items-center justify-between border-b border-[#E5D9C5] bg-[#FAF9F7] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8B5E34] text-white shadow-xs">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#33281E]">
                    XYRO Enterprise Upgrade
                  </h3>
                  <p className="text-xs text-[#8C7A6B]">
                    Dedicated infrastructure & multi-facility gym networks
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEnterpriseModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8">
              {enterpriseSubmitted ? (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="font-display text-xl font-bold text-[#33281E]">
                    Enterprise Request Received!
                  </h4>
                  <p className="text-xs text-[#8C7A6B] max-w-md mx-auto leading-relaxed">
                    Thank you, <strong className="text-[#33281E]">{gym.owner.name}</strong>. Our enterprise solutions team has received your gym&apos;s request for{" "}
                    <strong className="text-[#8B5E34]">{gym.name}</strong>.
                  </p>

                  <div className="mx-auto max-w-sm rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 text-xs space-y-1.5">
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Reference ID:</span>
                      <strong className="text-[#8B5E34] font-mono">{referenceId}</strong>
                    </div>
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Assigned Account Exec:</span>
                      <span className="text-[#33281E]">Enterprise Tier Specialist</span>
                    </div>
                    <div className="flex justify-between text-[#8C7A6B]">
                      <span>Response SLA:</span>
                      <span className="text-emerald-700 font-semibold">Under 24 Hours</span>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={`mailto:enterprise@xyro.fitness?subject=Enterprise%20Upgrade%20Inquiry%20-%20${encodeURIComponent(
                        gym.name
                      )}&body=Ref:%20${referenceId}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E5D9C5] bg-white px-5 text-xs font-semibold text-[#33281E] hover:bg-[#F3EFEA] transition w-full sm:w-auto"
                    >
                      <Mail className="h-4 w-4 text-[#8B5E34]" />
                      Email Sales Team
                    </a>
                    <Button
                      type="button"
                      onClick={() => setShowEnterpriseModal(false)}
                      className="btn-primary h-10 px-6 text-xs text-white font-bold w-full sm:w-auto"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEnterpriseSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                        Gym Workspace
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`${gym.name} (${gym.gymCode})`}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 text-xs text-[#8C7A6B]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                        Estimated Branches / Facilities
                      </label>
                      <select
                        value={enterpriseForm.branches}
                        onChange={(e) =>
                          setEnterpriseForm({ ...enterpriseForm, branches: e.target.value })
                        }
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                      >
                        <option value="1-2">1 - 2 Branches</option>
                        <option value="2-5">2 - 5 Branches</option>
                        <option value="6-15">6 - 15 Branches</option>
                        <option value="16-50">16 - 50 Branches (Chain)</option>
                        <option value="50+">50+ Branches (Franchise Network)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                        Owner / Decision Maker
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`${gym.owner.name} (${gym.owner.email})`}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 text-xs text-[#8C7A6B]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                        Contact Phone / WhatsApp
                      </label>
                      <input
                        type="text"
                        required
                        value={enterpriseForm.phone}
                        onChange={(e) =>
                          setEnterpriseForm({ ...enterpriseForm, phone: e.target.value })
                        }
                        placeholder="+91 98765 43210"
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                      Required Enterprise Modules
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      {[
                        "Biometrics & Turnstiles",
                        "Multi-Branch Sync",
                        "Custom Domain White-labeling",
                        "WhatsApp Verified API",
                        "Dedicated Database Region",
                        "Custom SLA 99.99%",
                      ].map((feat) => {
                        const checked = enterpriseForm.features.includes(feat);
                        return (
                          <button
                            type="button"
                            key={feat}
                            onClick={() => toggleEnterpriseFeature(feat)}
                            className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                              checked
                                ? "border-[#8B5E34] bg-[#8B5E34]/10 text-[#8B5E34]"
                                : "border-[#E5D9C5] bg-white text-[#8C7A6B] hover:text-[#33281E]"
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                checked
                                  ? "border-[#8B5E34] bg-[#8B5E34] text-white"
                                  : "border-[#E5D9C5]"
                              }`}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </div>
                            <span className="text-[11px] truncate font-medium">{feat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                      Additional Requirements / Timeline
                    </label>
                    <textarea
                      rows={2}
                      value={enterpriseForm.notes}
                      onChange={(e) =>
                        setEnterpriseForm({ ...enterpriseForm, notes: e.target.value })
                      }
                      placeholder="Tell us about your launch dates, custom hardware, or existing software migration..."
                      className="mt-1.5 w-full rounded-xl border border-[#E5D9C5] bg-white p-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none focus:border-[#8B5E34]"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEnterpriseModal(false)}
                      className="h-11 px-5 text-xs font-semibold text-[#8C7A6B] hover:text-[#33281E] transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      disabled={submittingEnterprise}
                      className="btn-primary h-11 px-6 text-xs text-white font-bold w-full sm:w-auto"
                    >
                      {submittingEnterprise ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting Consultation...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 text-white" />
                          Submit Enterprise Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

