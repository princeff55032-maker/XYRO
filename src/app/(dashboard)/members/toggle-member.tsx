"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Ban, CheckCircle2 } from "lucide-react";
import { toggleMemberActiveAction } from "../actions";

export function ToggleMemberButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await toggleMemberActiveAction(id);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={active ? "Deactivate member" : "Activate member"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
          : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : active ? (
        <Ban className="h-4 w-4" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
    </button>
  );
}
