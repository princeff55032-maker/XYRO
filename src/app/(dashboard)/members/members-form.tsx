"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  UserPlus,
  UserCheck,
  Check,
  Copy,
  KeyRound,
  Sparkles,
  ExternalLink,
  MessageCircle,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addMemberAction, type MemberCredentials } from "../actions";
import { formatCurrency } from "@/lib/utils";
import { CustomTimeSlotPicker } from "@/components/time-slot-picker";

export function AddMemberDialog({
  plans,
}: {
  plans: { id: string; name: string; price?: number; durationDays?: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] =
    useState<MemberCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    timeSlot: "",
    customTimeSlot: "",
    address: "",
    planId: "",
    discountType: "NONE" as "NONE" | "FIXED" | "PERCENTAGE",
    discountValue: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const resolvedTimeSlot =
      form.timeSlot === "CUSTOM"
        ? form.customTimeSlot.trim() || undefined
        : form.timeSlot || undefined;

    const res = await addMemberAction({
      name: form.name,
      email: form.email,
      phone: form.phone,
      gender: form.gender || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      timeSlot: resolvedTimeSlot,
      address: form.address || undefined,
      planId: form.planId || undefined,
      discountType: form.discountType !== "NONE" ? form.discountType : undefined,
      discountValue: form.discountValue ? parseFloat(form.discountValue) : undefined,
    });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Failed to add member");
      return;
    }

    setCreatedCredentials(res.data);
    setForm({
      name: "",
      email: "",
      phone: "",
      gender: "",
      dateOfBirth: "",
      timeSlot: "",
      customTimeSlot: "",
      address: "",
      planId: "",
      discountType: "NONE",
      discountValue: "",
    });
    router.refresh();
  }

  const selectedPlan = plans.find((p) => p.id === form.planId);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllCredentials = () => {
    if (!createdCredentials) return;
    const text = `🏋️ Welcome to ${createdCredentials.gymName}!
Your Member Portal Login Details:
━━━━━━━━━━━━━━━━━━━━━━
👤 Member Name: ${createdCredentials.name}
🆔 Member ID: ${createdCredentials.memberId}
📧 Email: ${createdCredentials.email}
🔑 Password: ${createdCredentials.password}
🌐 Login URL: ${window.location.origin}/login
━━━━━━━━━━━━━━━━━━━━━━
Select "Login as Gym Member" to access your Digital QR Pass, workout routines, and diet plans!`;

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const getWhatsAppShareUrl = () => {
    if (!createdCredentials) return "#";
    const cleanPhone = createdCredentials.phone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `🏋️ Hi ${createdCredentials.name}, welcome to ${createdCredentials.gymName}!\n\nHere are your XYRO Member Portal credentials:\n• Member ID: ${createdCredentials.memberId}\n• Email: ${createdCredentials.email}\n• Password: ${createdCredentials.password}\n• Login Portal: ${typeof window !== "undefined" ? window.location.origin : ""}/login\n\nLogin to view your touchless QR pass, workout plans, and membership details!`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  const handleClose = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setCreatedCredentials(null);
      setError(null);
    }
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="h-9.5 rounded-xl btn-primary">
          <Plus className="h-4 w-4 text-white" />
          Enroll Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {createdCredentials ? (
          /* Success & Credentials Display View */
          <div className="space-y-5 py-2">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <DialogTitle className="mt-3 font-display text-xl font-bold text-[#33281E]">
                Member Enrolled Successfully!
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[#8C7A6B]">
                Digital credentials generated. Send these credentials via WhatsApp or share them to allow portal login.
              </DialogDescription>
            </div>

            <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2.5">
                <span className="text-xs font-mono font-semibold text-[#8C7A6B]">Member Name</span>
                <span className="font-bold text-sm text-[#33281E]">
                  {createdCredentials.name}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2.5">
                <span className="text-xs font-mono font-semibold text-[#8C7A6B]">Member ID</span>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-mono text-xs">
                    {createdCredentials.memberId}
                  </Badge>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(createdCredentials.memberId, "memberId")
                    }
                    className="p-1 text-[#8C7A6B] hover:text-[#33281E] transition cursor-pointer"
                    title="Copy Member ID"
                  >
                    {copiedField === "memberId" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2.5">
                <span className="text-xs font-mono font-semibold text-[#8C7A6B]">Login Email</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#33281E]">
                    {createdCredentials.email}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(createdCredentials.email, "email")
                    }
                    className="p-1 text-[#8C7A6B] hover:text-[#33281E] transition cursor-pointer"
                    title="Copy Email"
                  >
                    {copiedField === "email" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-[#8C7A6B]">
                  Temporary Password
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#8B5E34]">
                    {createdCredentials.password}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(createdCredentials.password, "password")
                    }
                    className="p-1 text-[#8C7A6B] hover:text-[#33281E] transition cursor-pointer"
                    title="Copy Password"
                  >
                    {copiedField === "password" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Send WhatsApp Welcome</span>
              </a>

              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                className="rounded-xl border-[#E5D9C5] text-[#33281E] hover:bg-[#F3EFEA]"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Member Creation Form */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#8B5E34]" />
                Enroll New Member
              </DialogTitle>
              <DialogDescription>
                Creates member profile, issues a digital dynamic QR pass, and generates secure portal credentials.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Aryan Deshmukh"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Email Address *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="aryan@domain.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Phone *
                  </label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Gender
                  </label>
                  <Select
                    value={form.gender || undefined}
                    onValueChange={(v) => set("gender", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Preferred Time Slot
                  </label>
                  <Select
                    value={form.timeSlot || undefined}
                    onValueChange={(v) => set("timeSlot", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Preferred Time Slot (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning (06:00 AM - 09:00 AM)">Morning (06:00 AM - 09:00 AM)</SelectItem>
                      <SelectItem value="Midday (09:00 AM - 12:00 PM)">Midday (09:00 AM - 12:00 PM)</SelectItem>
                      <SelectItem value="Afternoon (12:00 PM - 04:00 PM)">Afternoon (12:00 PM - 04:00 PM)</SelectItem>
                      <SelectItem value="Evening (04:00 PM - 08:00 PM)">Evening (04:00 PM - 08:00 PM)</SelectItem>
                      <SelectItem value="Night (08:00 PM - 10:00 PM)">Night (08:00 PM - 10:00 PM)</SelectItem>
                      <SelectItem value="All Day / Flexible">All Day / Flexible Access</SelectItem>
                      <SelectItem value="CUSTOM">Custom Time Slot...</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.timeSlot === "CUSTOM" && (
                    <CustomTimeSlotPicker
                      value={form.customTimeSlot}
                      onChange={(v) => set("customTimeSlot", v)}
                    />
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Address
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Street, locality, city"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Membership Plan{" "}
                    <span className="text-[#8C7A6B] font-normal">
                      (optional — activates immediately)
                    </span>
                  </label>
                  <Select
                    value={form.planId || undefined}
                    onValueChange={(v) => set("planId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No plan yet" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.price !== undefined ? `— ${formatCurrency(p.price)}` : ""} {p.durationDays ? `(${p.durationDays} days)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Optional Discount Selector */}
                  {selectedPlan && selectedPlan.price !== undefined && (
                    <div className="mt-3 rounded-2xl border border-[#E5D9C5] bg-[#FAF9F7] p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#33281E]">Plan Base Price:</span>
                        <span className="font-mono font-bold text-[#8B5E34]">{formatCurrency(selectedPlan.price)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-[#8C7A6B]">Discount Mode</label>
                          <Select
                            value={form.discountType}
                            onValueChange={(v) => set("discountType", v as "NONE" | "FIXED" | "PERCENTAGE")}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">No Discount</SelectItem>
                              <SelectItem value="FIXED">Flat (₹ Amount)</SelectItem>
                              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {form.discountType !== "NONE" && (
                          <div>
                            <label className="text-[10px] font-mono font-bold uppercase text-[#8C7A6B]">
                              {form.discountType === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={form.discountValue}
                              onChange={(e) => set("discountValue", e.target.value)}
                              placeholder={form.discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 500"}
                              className="h-8 w-full rounded-xl border border-[#E5D9C5] bg-white px-2.5 text-xs text-[#33281E] outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {form.discountType !== "NONE" && form.discountValue && (
                        <div className="flex items-center justify-between border-t border-[#E5D9C5] pt-2 text-xs font-mono">
                          <span className="text-[#8C7A6B]">Net Payable Amount:</span>
                          <span className="font-bold text-emerald-800 text-sm">
                            {formatCurrency(
                              Math.max(
                                0,
                                selectedPlan.price -
                                  (form.discountType === "PERCENTAGE"
                                    ? (selectedPlan.price * Math.min(100, Math.max(0, parseFloat(form.discountValue) || 0))) / 100
                                    : Math.min(selectedPlan.price, Math.max(0, parseFloat(form.discountValue) || 0)))
                              )
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={loading} className="mt-1 btn-primary h-10 rounded-xl text-white font-bold">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {loading ? "Enrolling member…" : "Enroll Member & Generate Dynamic Pass"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
