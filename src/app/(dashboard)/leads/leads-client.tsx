"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Phone,
  Search,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  createLeadAction,
  updateLeadStatusAction,
  convertLeadToMemberAction,
} from "../actions";

interface LeadItem {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  source: string;
  status: string;
  trialDate: Date | null;
  notes: string | null;
  createdAt: Date;
}

interface PlanOption {
  id: string;
  name: string;
}

const STATUSES = ["ALL", "NEW", "CONTACTED", "TRIAL_BOOKED", "CONVERTED", "LOST"];

export function LeadsClient({
  leads,
  plans,
  gymCode,
}: {
  leads: LeadItem[];
  plans: PlanOption[];
  gymCode: string;
}) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [convertModalLead, setConvertModalLead] = useState<LeadItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || "");
  const [converting, setConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    source: "WALK_IN",
    trialDate: "",
    notes: "",
  });

  const filteredLeads = leads.filter((l) => {
    const matchesStatus = filterStatus === "ALL" || l.status === filterStatus;
    const matchesSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setError(null);

    const res = await createLeadAction({
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone,
      source: formData.source,
      trialDate: formData.trialDate || undefined,
      notes: formData.notes || undefined,
    });

    setAddLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to create lead");
    } else {
      setShowAddModal(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        source: "WALK_IN",
        trialDate: "",
        notes: "",
      });
      router.refresh();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateLeadStatusAction(id, newStatus);
    router.refresh();
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModalLead) return;

    setConverting(true);
    setError(null);

    const res = await convertLeadToMemberAction({
      leadId: convertModalLead.id,
      planId: selectedPlanId || undefined,
    });

    setConverting(false);
    if (!res.ok) {
      setError(res.error || "Failed to convert lead to member");
    } else {
      setConvertSuccess(
        `Success! ${convertModalLead.name} is now registered as Member ID: ${res.data?.memberId}`
      );
      setTimeout(() => {
        setConvertSuccess(null);
        setConvertModalLead(null);
        router.refresh();
      }, 2000);
    }
  };

  const publicTrialUrl = `/trial/${gymCode}`;

  return (
    <div className="space-y-6">
      {/* Top Banner with Public Link */}
      <div className="rounded-3xl border border-[#E5D9C5] bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F9F8F6] border border-[#E5D9C5] text-[#8B5E34] shadow-xs">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold text-[#8B5E34] uppercase tracking-widest">
              Public Trial Funnel Engine
            </h4>
            <p className="text-xs text-[#8C7A6B] mt-0.5">
              Share your gym&apos;s bespoke trial landing page on Instagram, Google Maps, or WhatsApp.
            </p>
          </div>
        </div>

        <a
          href={publicTrialUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-4 py-2 text-xs font-bold text-[#33281E] hover:bg-[#F3EFEA] transition shadow-xs"
        >
          <span>Open Public Trial Portal</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#8B5E34]" />
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D9C5] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-[#F3EFEA] rounded-2xl border border-[#E5D9C5]">
            {STATUSES.map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer font-mono ${
                  filterStatus === st
                    ? "bg-[#8B5E34] text-white shadow-xs"
                    : "text-[#8C7A6B] hover:text-[#33281E]"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C7A6B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prospects..."
              className="h-9 w-60 rounded-xl border border-[#E5D9C5] bg-white pl-9 pr-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none focus:border-[#8B5E34]"
            />
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="btn-primary rounded-xl"
        >
          <Plus className="h-3.5 w-3.5 text-white" />
          <span>Add Lead</span>
        </Button>
      </div>

      {/* Leads Table */}
      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-[#E5D9C5] bg-white py-16 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <p className="font-display text-base font-bold text-[#33281E]">No inquiries recorded in this view</p>
          <p className="max-w-sm text-xs text-[#8C7A6B]">
            Share your public trial portal link or manually log walk-in athletes.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5D9C5] bg-[#F9F8F6]">
                  <th className="h-10 px-4 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">
                    Prospect
                  </th>
                  <th className="h-10 px-4 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">
                    Contact
                  </th>
                  <th className="h-10 px-4 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">
                    Acquisition Channel
                  </th>
                  <th className="h-10 px-4 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">
                    Trial Booking
                  </th>
                  <th className="h-10 px-4 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">
                    Funnel Stage
                  </th>
                  <th className="h-10 px-4 text-right font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D9C5]">
                {filteredLeads.map((l) => (
                  <tr
                    key={l.id}
                    className="transition-colors hover:bg-[#FAF9F7]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#33281E]">{l.name}</div>
                      {l.notes && (
                        <p className="text-[11px] text-[#8C7A6B] line-clamp-1 mt-0.5">{l.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-semibold text-[#8B5E34]">
                        <Phone className="h-3 w-3 text-[#8B5E34]" />
                        <span>{l.phone}</span>
                      </div>
                      {l.email && <div className="text-[11px] text-[#8C7A6B] mt-0.5">{l.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] font-mono text-[#8B5E34]">
                        {l.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#33281E]">
                      {l.trialDate ? formatDate(l.trialDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={l.status}
                        onChange={(e) => handleStatusChange(l.id, e.target.value)}
                        className={`rounded-xl px-2.5 py-1 text-[11px] font-mono font-bold border outline-none cursor-pointer ${
                          l.status === "CONVERTED"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : l.status === "TRIAL_BOOKED"
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : l.status === "LOST"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-[#F9F8F6] border-[#E5D9C5] text-[#33281E]"
                        }`}
                      >
                        <option value="NEW">New Lead</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="TRIAL_BOOKED">Trial Booked</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {l.status !== "CONVERTED" ? (
                        <Button
                          size="sm"
                          onClick={() => setConvertModalLead(l)}
                          className="btn-primary rounded-xl"
                        >
                          <UserPlus className="h-3 w-3 text-white" />
                          <span>Convert</span>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-emerald-800 font-bold inline-flex items-center gap-1 font-mono">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                          Member
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Inbound Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33281E]/40 backdrop-blur-sm animate-fade-up">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-[#33281E]">Add Inbound Prospect</h3>
            <p className="mt-0.5 text-xs text-[#8C7A6B]">
              Log phone inquiries, walk-ins, and trial visitors.
            </p>

            <form onSubmit={handleCreateLead} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Lead Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Acquisition Channel
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                  >
                    <option value="WALK_IN">Walk-in Inquiry</option>
                    <option value="INSTAGRAM">Instagram / Social</option>
                    <option value="WEBSITE_TRIAL">Website Trial</option>
                    <option value="REFERRAL">Member Referral</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="optional@gmail.com"
                    className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Trial Date
                  </label>
                  <input
                    type="date"
                    value={formData.trialDate}
                    onChange={(e) => setFormData({ ...formData, trialDate: e.target.value })}
                    className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Operational Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Morning batch inquiry"
                  className="mt-1 w-full rounded-xl border border-[#E5D9C5] bg-white p-2.5 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border-[#E5D9C5] text-[#33281E] hover:bg-[#F3EFEA]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addLoading}
                  className="btn-primary rounded-xl"
                >
                  {addLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : "Save Lead"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Lead to Member Modal */}
      {convertModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33281E]/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-[#33281E]">
              Convert Lead to Member
            </h3>
            <p className="mt-0.5 text-xs text-[#8C7A6B]">
              Register <strong className="text-[#33281E]">{convertModalLead.name}</strong> as an active athlete.
            </p>

            {convertSuccess ? (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center text-xs text-emerald-800 font-bold font-mono">
                {convertSuccess}
              </div>
            ) : (
              <form onSubmit={handleConvert} className="mt-4 space-y-3.5">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-semibold">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Assign Plan Tier
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                  >
                    <option value="">No Plan / Assign Later</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConvertModalLead(null)}
                    className="rounded-xl border-[#E5D9C5] text-[#33281E] hover:bg-[#F3EFEA]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={converting}
                    className="btn-primary rounded-xl"
                  >
                    {converting ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      "Confirm Conversion"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
