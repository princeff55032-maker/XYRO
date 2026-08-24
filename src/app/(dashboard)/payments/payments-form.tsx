"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  CreditCard,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Sparkles,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  recordPaymentAction,
  updatePaymentAction,
  deletePaymentAction,
} from "../actions";

export function RecordPaymentDialog({
  members,
  plans,
}: {
  members: { id: string; label: string }[];
  plans: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    amount: "",
    method: "CASH",
    planId: "",
    notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.memberId) {
      setError("Select a member");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await recordPaymentAction({
      memberId: form.memberId,
      amount: form.amount,
      method: form.method,
      planId: form.planId || undefined,
      notes: form.notes || undefined,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to record payment");
      return;
    }
    setOpen(false);
    setForm({ memberId: "", amount: "", method: "CASH", planId: "", notes: "" });
    router.refresh();
  }

  const inputCls =
    "h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9.5 rounded-xl btn-primary">
          <Plus className="h-4 w-4 text-white" />
          Record Inflow
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4.5 w-4.5 text-[#8B5E34]" />
            Record Payment Transaction
          </DialogTitle>
          <DialogDescription>
            Attach a membership plan tier to instantly renew or activate the athlete&apos;s validity.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-mono font-medium">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
              Athlete *
            </label>
            <Select
              value={form.memberId || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, memberId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select athlete" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Amount (₹) *
              </label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="2499"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                Payment Method
              </label>
              <Select
                value={form.method}
                onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}
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
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
              Renew / Assign Plan <span className="text-[#8C7A6B] font-normal">(optional)</span>
            </label>
            <Select
              value={form.planId || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, planId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No plan attached" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
              Notes
            </label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Transaction ref, invoice note, or promo discount"
              className={inputCls}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="mt-1 btn-primary h-10 rounded-xl text-white font-bold"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {loading ? "Recording transaction…" : "Record Payment Inflow"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Modify Payment Record Dialog                                       */
/* ------------------------------------------------------------------ */

export function ModifyPaymentDialog({
  payment,
}: {
  payment: {
    id: string;
    memberName: string;
    amount: number;
    method: string;
    status: string;
    notes?: string | null;
    paidAt?: string | Date | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialDate = payment.paidAt
    ? new Date(payment.paidAt).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    amount: payment.amount.toString(),
    method: payment.method,
    status: payment.status,
    notes: payment.notes || "",
    paidAt: initialDate,
  });

  const handleOpen = () => {
    setForm({
      amount: payment.amount.toString(),
      method: payment.method,
      status: payment.status,
      notes: payment.notes || "",
      paidAt: initialDate,
    });
    setError(null);
    setShowDeleteConfirm(false);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updatePaymentAction({
      paymentId: payment.id,
      amount: form.amount,
      method: form.method,
      status: form.status,
      notes: form.notes || undefined,
      paidAt: form.paidAt || undefined,
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to update payment record");
      return;
    }

    setOpen(false);
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError(null);

    const res = await deletePaymentAction({
      paymentId: payment.id,
    });

    setDeleteLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to delete payment record");
      return;
    }

    setOpen(false);
    router.refresh();
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-[#E5D9C5] bg-white px-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-colors focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15";

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Modify Payment Record"
        className="inline-flex items-center gap-1 rounded-lg border border-[#E5D9C5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#33281E] hover:border-[#8B5E34] hover:text-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
      >
        <Pencil className="h-3 w-3 text-[#8B5E34]" />
        <span>Modify</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#8B5E34]" />
              Modify Payment Record
            </DialogTitle>
            <DialogDescription>
              Update transaction details, payment method, settlement status, or notes for{" "}
              <strong className="text-[#33281E]">{payment.memberName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {showDeleteConfirm ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 space-y-3 text-left animate-fade-up">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-950">
                    Void / Delete This Payment Record?
                  </h4>
                  <p className="text-[11px] text-red-800 leading-relaxed mt-0.5">
                    This action will permanently delete this payment transaction record from the revenue ledger.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-200/60">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="rounded-lg border border-[#E5D9C5] bg-white px-3 py-1.5 text-xs font-semibold text-[#33281E] hover:bg-[#F3EFEA] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
                >
                  {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Athlete
                </label>
                <input
                  disabled
                  value={payment.memberName}
                  className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 text-xs font-semibold text-[#33281E] opacity-90 cursor-not-allowed"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Amount (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Payment Method
                  </label>
                  <Select
                    value={form.method}
                    onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Status
                  </label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">PAID (Settled)</SelectItem>
                      <SelectItem value="PENDING">PENDING (Awaiting)</SelectItem>
                      <SelectItem value="FAILED">FAILED</SelectItem>
                      <SelectItem value="REFUNDED">REFUNDED</SelectItem>
                      <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={form.paidAt}
                    onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Notes / Reference ID
                </label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Transaction ref, invoice note, or adjustment note"
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-between border-t border-[#E5D9C5] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Void Record</span>
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="h-9 px-4 text-xs font-semibold text-[#8C7A6B]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="btn-primary h-9 px-5 text-xs font-bold text-white rounded-xl cursor-pointer"
                  >
                    {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
