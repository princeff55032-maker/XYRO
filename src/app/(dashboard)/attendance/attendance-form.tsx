"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordAttendanceAction } from "../actions";

export function CheckInDialog({ members }: { members: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) {
      setError("Select a member");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await recordAttendanceAction({ memberId, method: "MANUAL" });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to check in");
      return;
    }
    setOpen(false);
    setMemberId("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9.5 rounded-xl btn-primary">
          <ScanLine className="h-4 w-4 text-white" />
          Scan Dynamic Pass
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4.5 w-4.5 text-[#8B5E34]" />
            Manual Turnstile Override
          </DialogTitle>
          <DialogDescription>
            Log an in-person floor entry and verify active membership validity.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Athlete *</label>
            <Select value={memberId || undefined} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="mt-1 btn-primary h-10 rounded-xl text-white font-bold">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {loading ? "Verifying…" : "Grant Floor Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
