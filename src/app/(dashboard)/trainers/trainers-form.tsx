"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Dumbbell,
  Check,
  Copy,
  Sparkles,
  MessageCircle,
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
import { addTrainerAction, type TrainerCredentials } from "../actions";

export function AddTrainerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] =
    useState<TrainerCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    experience: "",
    bio: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await addTrainerAction({
      name: form.name,
      email: form.email,
      phone: form.phone,
      specialization: form.specialization || undefined,
      experience: form.experience || undefined,
      bio: form.bio || undefined,
    });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Failed to add trainer");
      return;
    }

    setCreatedCredentials(res.data);
    setForm({
      name: "",
      email: "",
      phone: "",
      specialization: "",
      experience: "",
      bio: "",
    });
    router.refresh();
  }

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllCredentials = () => {
    if (!createdCredentials) return;
    const text = `🏋️‍♂️ Welcome to ${createdCredentials.gymName}!
Your Trainer Portal Login Details:
━━━━━━━━━━━━━━━━━━━━━━
👤 Trainer Name: ${createdCredentials.name}
📧 Email / Username: ${createdCredentials.email}
🔑 Password: ${createdCredentials.password}
🌐 Login URL: ${window.location.origin}/login
━━━━━━━━━━━━━━━━━━━━━━
Select "Login as Trainer" to access your assigned members, workout programs, and schedule!`;

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const getWhatsAppShareUrl = () => {
    if (!createdCredentials) return "#";
    const cleanPhone = createdCredentials.phone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `🏋️‍♂️ Hi ${createdCredentials.name}, welcome to the training team at ${createdCredentials.gymName}!\n\nHere are your XYRO Trainer Portal credentials:\n• Email: ${createdCredentials.email}\n• Password: ${createdCredentials.password}\n• Login Portal: ${typeof window !== "undefined" ? window.location.origin : ""}/login\n\nLogin to manage your assigned members and routines!`
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
          Induct Coach
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {createdCredentials ? (
          /* Credentials Display View */
          <div className="space-y-5 py-2">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <DialogTitle className="mt-3 font-display text-xl font-bold text-[#33281E]">
                Coach Inducted Successfully!
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[#8C7A6B]">
                Staff credentials created automatically for the Trainer Portal &amp; Client Tracking.
              </DialogDescription>
            </div>

            <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2.5">
                <span className="text-xs font-mono font-semibold text-[#8C7A6B]">Coach Name</span>
                <span className="font-bold text-sm text-[#33281E]">
                  {createdCredentials.name}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2.5">
                <span className="text-xs font-mono font-semibold text-[#8C7A6B]">Login Email</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#33281E]">
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
                <span className="text-xs font-mono font-semibold text-[#8C7A6B]">Generated Password</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white border border-[#E5D9C5] px-2 py-0.5 font-mono text-xs font-bold text-[#8B5E34]">
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
              <Button
                type="button"
                onClick={copyAllCredentials}
                className="flex-1 btn-primary rounded-xl"
              >
                {copiedAll ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-white" />
                    Copied All Details!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4 text-white" />
                    Copy Login Credentials
                  </>
                )}
              </Button>

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
          /* Form Entry View */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="h-4.5 w-4.5 text-[#8B5E34]" />
                Induct Coach / Trainer
              </DialogTitle>
              <DialogDescription>
                A staff user account with trainer dashboard permissions will be created automatically.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-mono font-medium">
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Marcus Vance"
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="marcus@domain.com"
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+91 98765 43210"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Specialization
                  </label>
                  <input
                    value={form.specialization}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, specialization: e.target.value }))
                    }
                    placeholder="Strength & Conditioning"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Experience
                  </label>
                  <input
                    value={form.experience}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, experience: e.target.value }))
                    }
                    placeholder="6 years"
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Professional Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bio: e.target.value }))
                    }
                    rows={2}
                    placeholder="Certified in progressive overload and Olympic weightlifting protocols…"
                    className="w-full rounded-xl border border-[#E5D9C5] bg-white px-3 py-2 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34]"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="mt-1 btn-primary h-10 rounded-xl text-white font-bold">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {loading ? "Inducting coach…" : "Induct Coach & Issue Credentials"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
