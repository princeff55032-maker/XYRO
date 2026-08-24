"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deactivatePlanAction } from "../actions";

export function DeactivatePlanButton({ id, disabled }: { id: string; disabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (disabled) return;
    if (!confirm("Deactivate this plan? Existing memberships stay valid.")) return;
    setLoading(true);
    await deactivatePlanAction(id);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={disabled ? "Has active members" : "Deactivate plan"}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {!loading && <Trash2 className="h-3.5 w-3.5" />}
      Deactivate
    </button>
  );
}
