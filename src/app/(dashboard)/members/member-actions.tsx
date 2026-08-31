"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Ban,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  X,
  CreditCard,
  Plus,
  Pencil,
  Clock,
  User,
  Calendar,
  Shield,
  Tag,
  Percent,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  toggleMemberActiveAction,
  removeMemberAction,
  assignPlanToMemberAction,
  updateMemberDetailsAction,
  updateMembershipAction,
} from "../actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface ActiveMembershipInfo {
  id: string;
  planId: string;
  planName: string;
  status: "ACTIVE" | "EXPIRED" | "PAUSED" | "CANCELLED" | "PENDING";
  startDate: Date | string;
  endDate: Date | string;
  daysRemaining?: number | null;
  autoRenew: boolean;
}

interface MemberActionsProps {
  memberId: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  memberGender?: string | null;
  timeSlot?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  activeMembership?: ActiveMembershipInfo | null;
  plans?: { id: string; name: string; price: number; durationDays: number }[];
}

export function MemberActions({
  memberId,
  memberName,
  memberEmail = "",
  memberPhone = "",
  memberGender = "",
  timeSlot = "",
  address = "",
  notes = "",
  isActive,
  activeMembership = null,
  plans = [],
}: MemberActionsProps) {
  const router = useRouter();
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Edit Member Profile & Time Slot Dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: memberName,
    email: memberEmail,
    phone: memberPhone,
    gender: memberGender || "",
    timeSlot: timeSlot || "",
    customTimeSlot: "",
    address: address || "",
    notes: notes || "",
  });

  // Assign Plan Dialog state (with discounts)
  const [showAssignPlan, setShowAssignPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discountType, setDiscountType] = useState<"NONE" | "FIXED" | "PERCENTAGE">("NONE");
  const [discountValue, setDiscountValue] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Modify Membership Dialog state
  const [showModifyMembership, setShowModifyMembership] = useState(false);
  const [modifyLoading, setModifyLoading] = useState(false);
  const [modifyForm, setModifyForm] = useState({
    planId: activeMembership?.planId || "",
    status: (activeMembership?.status || "ACTIVE") as "ACTIVE" | "EXPIRED" | "PAUSED" | "CANCELLED" | "PENDING",
    startDate: activeMembership ? new Date(activeMembership.startDate).toISOString().split("T")[0] : "",
    endDate: activeMembership ? new Date(activeMembership.endDate).toISOString().split("T")[0] : "",
    autoRenew: activeMembership?.autoRenew ?? false,
    notes: "",
  });

  const [error, setError] = useState<string | null>(null);

  const handleOpenModifyMembership = () => {
    if (!activeMembership) return;
    setError(null);
    setModifyForm({
      planId: activeMembership.planId,
      status: activeMembership.status,
      startDate: new Date(activeMembership.startDate).toISOString().split("T")[0],
      endDate: new Date(activeMembership.endDate).toISOString().split("T")[0],
      autoRenew: activeMembership.autoRenew,
      notes: "",
    });
    setShowModifyMembership(true);
  };

  const handleSaveModifyMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMembership) return;
    setModifyLoading(true);
    setError(null);

    const res = await updateMembershipAction({
      membershipId: activeMembership.id,
      planId: modifyForm.planId || undefined,
      status: modifyForm.status,
      startDate: modifyForm.startDate || undefined,
      endDate: modifyForm.endDate || undefined,
      autoRenew: modifyForm.autoRenew,
      notes: modifyForm.notes.trim() || undefined,
    });

    setModifyLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to update membership");
      return;
    }

    setShowModifyMembership(false);
    router.refresh();
  };

  const handleOpenEdit = () => {
    setError(null);
    const isStandardSlot = [
      "Morning (06:00 AM - 09:00 AM)",
      "Midday (09:00 AM - 12:00 PM)",
      "Afternoon (12:00 PM - 04:00 PM)",
      "Evening (04:00 PM - 08:00 PM)",
      "Night (08:00 PM - 10:00 PM)",
      "All Day / Flexible",
    ].includes(timeSlot || "");

    setEditForm({
      name: memberName,
      email: memberEmail,
      phone: memberPhone,
      gender: memberGender || "",
      timeSlot: isStandardSlot ? timeSlot || "" : timeSlot ? "CUSTOM" : "",
      customTimeSlot: !isStandardSlot && timeSlot ? timeSlot : "",
      address: address || "",
      notes: notes || "",
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setError(null);

    const resolvedTimeSlot =
      editForm.timeSlot === "CUSTOM"
        ? editForm.customTimeSlot.trim() || undefined
        : editForm.timeSlot || undefined;

    const res = await updateMemberDetailsAction({
      memberId,
      name: editForm.name.trim() || undefined,
      email: editForm.email.trim() || undefined,
      phone: editForm.phone.trim() || undefined,
      gender: editForm.gender || undefined,
      timeSlot: resolvedTimeSlot,
      address: editForm.address.trim() || undefined,
      notes: editForm.notes.trim() || undefined,
    });

    setEditLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to update member details");
      return;
    }

    setShowEdit(false);
    router.refresh();
  };

  const handleToggle = async () => {
    setToggleLoading(true);
    setError(null);
    const res = await toggleMemberActiveAction(memberId);
    setToggleLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to update member status");
    } else {
      router.refresh();
    }
  };

  const handleRemove = async () => {
    setDeleteLoading(true);
    setError(null);
    const res = await removeMemberAction(memberId);
    setDeleteLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to remove member");
    } else {
      setShowConfirm(false);
      router.refresh();
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setError("Please select a membership plan");
      return;
    }

    setAssignLoading(true);
    setError(null);
    const res = await assignPlanToMemberAction({
      memberId,
      planId: selectedPlanId,
      paymentMethod,
      discountType: discountType !== "NONE" ? discountType : undefined,
      discountValue: discountValue ? parseFloat(discountValue) : undefined,
      notes: planNotes || undefined,
    });
    setAssignLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to assign membership plan");
      return;
    }

    setShowAssignPlan(false);
    setSelectedPlanId("");
    setDiscountType("NONE");
    setDiscountValue("");
    setPlanNotes("");
    router.refresh();
  };

  const chosenPlan = plans.find((p) => p.id === selectedPlanId);

  const inputCls =
    "h-9 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none focus:border-[#8B5E34] focus:bg-white transition";

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {/* Modify Active Membership Button */}
        {activeMembership && (
          <button
            type="button"
            onClick={handleOpenModifyMembership}
            title="Modify Membership Plan, Status, & Dates"
            className="inline-flex items-center gap-1 rounded-xl border border-[#E5D9C5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#33281E] hover:border-[#8B5E34] hover:text-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
          >
            <Calendar className="h-3 w-3 text-[#8B5E34]" />
            <span>Modify Pass</span>
          </button>
        )}

        {/* Edit Member & Time Slot Button */}
        <button
          type="button"
          onClick={handleOpenEdit}
          title="Edit Member Profile & Time Slot"
          className="inline-flex items-center gap-1 rounded-xl border border-[#E5D9C5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#33281E] hover:border-[#8B5E34] hover:text-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
        >
          <Pencil className="h-3 w-3 text-[#8B5E34]" />
          <span>Edit</span>
        </button>

        {/* Assign / Renew Plan Button */}
        {plans.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowAssignPlan(true);
            }}
            title="Assign / Renew Membership Plan"
            className="inline-flex items-center gap-1 rounded-xl border border-[#E5D9C5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#33281E] hover:border-[#8B5E34] hover:text-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
          >
            <CreditCard className="h-3 w-3 text-[#8B5E34]" />
            <span>+ Plan</span>
          </button>
        )}

        {/* Toggle Active / Inactive */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggleLoading}
          title={isActive ? "Deactivate member" : "Activate member"}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
            isActive
              ? "border-[#E5D9C5] bg-[#F9F8F6] text-[#8B5E34] hover:bg-[#F3EFEA]"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          {toggleLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isActive ? (
            <Ban className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Remove Member */}
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          title="Remove Member from Gym"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Edit Member & Time Slot Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <User className="h-5 w-5 text-[#8B5E34]" />
              Edit Member &amp; Time Slot
            </DialogTitle>
            <DialogDescription className="text-left">
              Update member contact details and preferred gym workout time slot.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Phone
                </label>
                <input
                  required
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Time Slot Selector */}
            <div>
              <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Workout Time Slot
              </label>
              <Select
                value={editForm.timeSlot || undefined}
                onValueChange={(v) => setEditForm({ ...editForm, timeSlot: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Time Slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning (06:00 AM - 09:00 AM)">🌅 Morning (06:00 AM - 09:00 AM)</SelectItem>
                  <SelectItem value="Midday (09:00 AM - 12:00 PM)">☀️ Midday (09:00 AM - 12:00 PM)</SelectItem>
                  <SelectItem value="Afternoon (12:00 PM - 04:00 PM)">🌤️ Afternoon (12:00 PM - 04:00 PM)</SelectItem>
                  <SelectItem value="Evening (04:00 PM - 08:00 PM)">🌆 Evening (04:00 PM - 08:00 PM)</SelectItem>
                  <SelectItem value="Night (08:00 PM - 10:00 PM)">🌙 Night (08:00 PM - 10:00 PM)</SelectItem>
                  <SelectItem value="All Day / Flexible">⚡ All Day / Flexible Access</SelectItem>
                  <SelectItem value="CUSTOM">✏️ Custom Time Slot...</SelectItem>
                </SelectContent>
              </Select>

              {editForm.timeSlot === "CUSTOM" && (
                <input
                  value={editForm.customTimeSlot}
                  onChange={(e) => setEditForm({ ...editForm, customTimeSlot: e.target.value })}
                  placeholder="e.g. 05:30 AM - 07:00 AM"
                  className={`mt-2 ${inputCls}`}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Gender
                </label>
                <Select
                  value={editForm.gender || undefined}
                  onValueChange={(v) => setEditForm({ ...editForm, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Address
                </label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Locality, City"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Admin Notes
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Health constraints, fitness goals, or locker preferences"
                rows={2}
                className="w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-2 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none focus:border-[#8B5E34] focus:bg-white transition"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEdit(false)}
                className="rounded-xl border-[#E5D9C5] text-[#33281E]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="btn-primary rounded-xl text-white font-bold"
              >
                {editLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Plan Modal */}
      <Dialog open={showAssignPlan} onOpenChange={setShowAssignPlan}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <CreditCard className="h-5 w-5 text-[#8B5E34]" />
              Assign / Renew Plan
            </DialogTitle>
            <DialogDescription className="text-left">
              Assign a membership plan to <strong className="text-[#33281E]">{memberName}</strong>. This will activate their pass and automatically record the transaction in the Payment Ledger.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleAssignPlan} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Select Membership Plan *
              </label>
              <Select
                value={selectedPlanId || undefined}
                onValueChange={setSelectedPlanId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a membership plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} ({p.durationDays} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Payment Collection Method
              </label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI Dynamic Link</SelectItem>
                  <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">NEFT / Bank Transfer</SelectItem>
                  <SelectItem value="ONLINE">Online Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Notes / Reference ID <span className="text-[#8C7A6B] font-normal">(optional)</span>
              </label>
              <input
                value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
                placeholder="e.g. In-person counter payment or promo code"
                className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15"
              />
            </div>

            {chosenPlan && (
              <div className="rounded-2xl border border-[#E5D9C5] bg-[#FAF9F7] p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#33281E]">{chosenPlan.name} Standard Price:</span>
                  <span className="font-mono font-bold text-[#8B5E34]">{formatCurrency(chosenPlan.price)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-[#8C7A6B]">Discount Mode</label>
                    <Select
                      value={discountType}
                      onValueChange={(v) => setDiscountType(v as "NONE" | "FIXED" | "PERCENTAGE")}
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

                  {discountType !== "NONE" && (
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-[#8C7A6B]">
                        {discountType === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 500"}
                        className="h-8 w-full rounded-xl border border-[#E5D9C5] bg-white px-2.5 text-xs text-[#33281E] outline-none"
                      />
                    </div>
                  )}
                </div>

                {discountType !== "NONE" && discountValue && (
                  <div className="flex items-center justify-between border-t border-[#E5D9C5] pt-2 text-xs font-mono">
                    <span className="text-[#8C7A6B]">Net Payable Amount:</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {formatCurrency(
                        Math.max(
                          0,
                          chosenPlan.price -
                            (discountType === "PERCENTAGE"
                              ? (chosenPlan.price * Math.min(100, Math.max(0, parseFloat(discountValue) || 0))) / 100
                              : Math.min(chosenPlan.price, Math.max(0, parseFloat(discountValue) || 0)))
                        )
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-[#E5D9C5] pt-4 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignPlan(false)}
                className="h-9 px-4 text-xs font-semibold text-[#8C7A6B]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignLoading || !selectedPlanId}
                className="btn-primary h-9 px-5 text-xs font-bold text-white rounded-xl cursor-pointer"
              >
                {assignLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Assign &amp; Record Inflow
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modify Membership Dialog */}
      <Dialog open={showModifyMembership} onOpenChange={setShowModifyMembership}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <Calendar className="h-5 w-5 text-[#8B5E34]" />
              Modify Membership &amp; Validity
            </DialogTitle>
            <DialogDescription className="text-left">
              Adjust membership tier, change active/paused status, or modify expiry dates for <strong className="text-[#33281E]">{memberName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveModifyMembership} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Membership Plan
              </label>
              <Select
                value={modifyForm.planId}
                onValueChange={(v) => setModifyForm({ ...modifyForm, planId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.durationDays} days) — {formatCurrency(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Membership Status
              </label>
              <Select
                value={modifyForm.status}
                onValueChange={(v) => setModifyForm({ ...modifyForm, status: v as never })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">🟢 Active (Access Granted)</SelectItem>
                  <SelectItem value="PAUSED">⏸️ Paused / Frozen</SelectItem>
                  <SelectItem value="EXPIRED">🔴 Expired</SelectItem>
                  <SelectItem value="CANCELLED">❌ Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Start Date
                </label>
                <input
                  type="date"
                  value={modifyForm.startDate}
                  onChange={(e) => setModifyForm({ ...modifyForm, startDate: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Expiry / End Date
                </label>
                <input
                  type="date"
                  value={modifyForm.endDate}
                  onChange={(e) => setModifyForm({ ...modifyForm, endDate: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Quick extension helper */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-[#8C7A6B]">Quick Extend:</span>
              <button
                type="button"
                onClick={() => {
                  const current = modifyForm.endDate ? new Date(modifyForm.endDate) : new Date();
                  current.setDate(current.getDate() + 30);
                  setModifyForm({ ...modifyForm, endDate: current.toISOString().split("T")[0] });
                }}
                className="rounded-lg border border-[#E5D9C5] bg-[#FAF9F7] px-2 py-0.5 text-[10px] font-semibold text-[#8B5E34] hover:bg-white transition cursor-pointer"
              >
                +30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = modifyForm.endDate ? new Date(modifyForm.endDate) : new Date();
                  current.setDate(current.getDate() + 90);
                  setModifyForm({ ...modifyForm, endDate: current.toISOString().split("T")[0] });
                }}
                className="rounded-lg border border-[#E5D9C5] bg-[#FAF9F7] px-2 py-0.5 text-[10px] font-semibold text-[#8B5E34] hover:bg-white transition cursor-pointer"
              >
                +90 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = modifyForm.endDate ? new Date(modifyForm.endDate) : new Date();
                  current.setFullYear(current.getFullYear() + 1);
                  setModifyForm({ ...modifyForm, endDate: current.toISOString().split("T")[0] });
                }}
                className="rounded-lg border border-[#E5D9C5] bg-[#FAF9F7] px-2 py-0.5 text-[10px] font-semibold text-[#8B5E34] hover:bg-white transition cursor-pointer"
              >
                +1 Year
              </button>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Admin Notes (Optional)
              </label>
              <textarea
                value={modifyForm.notes}
                onChange={(e) => setModifyForm({ ...modifyForm, notes: e.target.value })}
                placeholder="Reason for extension, freeze period, or manual adjustments"
                rows={2}
                className="w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-2 text-xs text-[#33281E] outline-none focus:border-[#8B5E34] focus:bg-white transition"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5D9C5]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModifyMembership(false)}
                className="rounded-xl border-[#E5D9C5] text-[#33281E]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={modifyLoading}
                className="btn-primary rounded-xl text-white font-bold"
              >
                {modifyLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Update Membership
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33281E]/40 backdrop-blur-sm animate-fade-up">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white p-6 shadow-[0_25px_60px_rgba(51,40,30,0.15)] text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-bold text-[#33281E]">
                  Remove Member
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#33281E]">
                  Are you sure you want to remove <strong className="text-[#33281E]">{memberName}</strong> from your gym?
                </p>
                <p className="mt-2 text-[11px] text-[#8C7A6B]">
                  Their attendance logs and membership records will be archived, and they will no longer be listed as an active athlete.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-full p-1 text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E] transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={deleteLoading}
                className="rounded-xl border border-[#E5D9C5] bg-white px-4 py-2 text-xs font-semibold text-[#33281E] hover:bg-[#F3EFEA] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Removal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
