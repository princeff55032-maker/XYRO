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
} from "../actions";
import { formatCurrency } from "@/lib/utils";

interface MemberActionsProps {
  memberId: string;
  memberName: string;
  isActive: boolean;
  plans?: { id: string; name: string; price: number; durationDays: number }[];
}

export function MemberActions({
  memberId,
  memberName,
  isActive,
  plans = [],
}: MemberActionsProps) {
  const router = useRouter();
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Assign Plan Dialog state
  const [showAssignPlan, setShowAssignPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

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
      notes: notes || undefined,
    });
    setAssignLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to assign membership plan");
      return;
    }

    setShowAssignPlan(false);
    setSelectedPlanId("");
    setNotes("");
    router.refresh();
  };

  const chosenPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. In-person counter payment or promo code"
                className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15"
              />
            </div>

            {chosenPlan && (
              <div className="rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#33281E]">{chosenPlan.name}</p>
                  <p className="text-[11px] text-[#8C7A6B]">Duration: {chosenPlan.durationDays} days</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {formatCurrency(chosenPlan.price)}
                  </span>
                  <p className="text-[10px] font-mono text-[#8C7A6B]">Auto-logged to ledger</p>
                </div>
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
