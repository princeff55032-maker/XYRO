"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ban, CheckCircle2, Trash2, AlertTriangle, X } from "lucide-react";
import { toggleMemberActiveAction, removeMemberAction } from "../actions";

interface MemberActionsProps {
  memberId: string;
  memberName: string;
  isActive: boolean;
}

export function MemberActions({ memberId, memberName, isActive }: MemberActionsProps) {
  const router = useRouter();
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
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
