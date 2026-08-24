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
  UserPlus,
  Search,
  Users,
  Check,
} from "lucide-react";
import {
  toggleTrainerActiveAction,
  removeTrainerAction,
  assignMultipleMembersToTrainerAction,
} from "../actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

export interface GymMemberSummary {
  id: string;
  memberId: string;
  name: string;
  email: string;
  phone?: string | null;
  assignedTrainerId?: string | null;
  assignedTrainerName?: string | null;
  planName?: string | null;
}

interface TrainerActionsProps {
  trainerId: string;
  trainerName: string;
  isActive: boolean;
  memberCount: number;
  allMembers?: GymMemberSummary[];
}

export function TrainerActions({
  trainerId,
  trainerName,
  isActive,
  memberCount,
  allMembers = [],
}: TrainerActionsProps) {
  const router = useRouter();
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assign Members Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const openAssignModal = () => {
    // Pre-populate with members currently assigned to this trainer
    const currentAssigned = allMembers
      .filter((m) => m.assignedTrainerId === trainerId)
      .map((m) => m.id);
    setSelectedMemberIds(currentAssigned);
    setMemberSearch("");
    setAssignError(null);
    setShowAssignModal(true);
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleSaveAssignments = async () => {
    setAssignLoading(true);
    setAssignError(null);
    const res = await assignMultipleMembersToTrainerAction({
      trainerId,
      memberIds: selectedMemberIds,
    });
    setAssignLoading(false);
    if (!res.ok) {
      setAssignError(res.error || "Failed to update member assignments");
    } else {
      setShowAssignModal(false);
      router.refresh();
    }
  };

  const handleToggle = async () => {
    setToggleLoading(true);
    setError(null);
    const res = await toggleTrainerActiveAction(trainerId);
    setToggleLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to update coach status");
    } else {
      router.refresh();
    }
  };

  const handleRemove = async () => {
    setDeleteLoading(true);
    setError(null);
    const res = await removeTrainerAction(trainerId);
    setDeleteLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to remove trainer");
    } else {
      setShowConfirm(false);
      router.refresh();
    }
  };

  const filteredMembers = allMembers.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.memberId.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5D9C5] pt-3.5">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
          Coach Controls
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Add / Assign Members Button */}
          <button
            type="button"
            onClick={openAssignModal}
            title="Assign Athletes to this Trainer"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#8B5E34]/30 bg-[#FAF9F7] px-2.5 text-xs font-bold text-[#8B5E34] hover:bg-[#8B5E34] hover:text-white transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Assign Members</span>
          </button>

          {/* Toggle Active / Inactive */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggleLoading}
            title={isActive ? "Deactivate trainer" : "Activate trainer"}
            className={`inline-flex h-8 items-center gap-1 rounded-xl border px-2.5 text-xs transition-colors cursor-pointer ${
              isActive
                ? "border-[#E5D9C5] bg-[#F9F8F6] text-[#8B5E34] hover:bg-[#F3EFEA]"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            {toggleLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isActive ? (
              <>
                <Ban className="h-3.5 w-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Activate</span>
              </>
            )}
          </button>

          {/* Remove Trainer */}
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            title="Remove Trainer from Gym"
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 text-xs text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Remove</span>
          </button>
        </div>
      </div>

      {/* Assign Members Dialog */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#8B5E34]" />
              Assign Athletes to Coach {trainerName}
            </DialogTitle>
            <DialogDescription>
              Select the members who should be assigned to this trainer&apos;s coaching roster.
            </DialogDescription>
          </DialogHeader>

          {assignError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
              {assignError}
            </div>
          )}

          {/* Member Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search member by name, ID, or email..."
              className="h-10 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] pl-10 pr-3 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none focus:border-[#8B5E34] focus:bg-white"
            />
          </div>

          {/* Member Selection List */}
          <div className="mt-2 max-h-72 overflow-y-auto space-y-2 pr-1">
            {filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8C7A6B]">
                {allMembers.length === 0
                  ? "No gym members registered yet."
                  : "No members match your search."}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);
                const isCurrentTrainer = member.assignedTrainerId === trainerId;
                const otherTrainer =
                  member.assignedTrainerId && !isCurrentTrainer
                    ? member.assignedTrainerName
                    : null;

                return (
                  <div
                    key={member.id}
                    onClick={() => toggleMemberSelection(member.id)}
                    className={`flex items-center justify-between rounded-2xl border p-3 cursor-pointer transition ${
                      isSelected
                        ? "border-[#8B5E34] bg-[#FAF9F7]"
                        : "border-[#E5D9C5] bg-white hover:bg-[#F9F8F6]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                          isSelected
                            ? "border-[#8B5E34] bg-[#8B5E34] text-white"
                            : "border-[#E5D9C5] bg-white"
                        }`}
                      >
                        {isSelected && <Check className="h-4 w-4" />}
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8B5E34] text-xs font-bold text-white shadow-xs">
                        {getInitials(member.name)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-[#33281E] truncate">
                            {member.name}
                          </p>
                          <span className="font-mono text-[10px] font-bold text-[#8B5E34]">
                            {member.memberId}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8C7A6B] truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {otherTrainer ? (
                        <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          With Coach {otherTrainer}
                        </span>
                      ) : isCurrentTrainer ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#8C7A6B] bg-[#F9F8F6] border border-[#E5D9C5] px-2 py-0.5 rounded-md">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Summary & Actions */}
          <div className="flex items-center justify-between border-t border-[#E5D9C5] pt-4 mt-2">
            <span className="text-xs font-semibold text-[#8C7A6B]">
              <strong className="text-[#33281E]">{selectedMemberIds.length}</strong> athlete
              {selectedMemberIds.length === 1 ? "" : "s"} selected
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignModal(false)}
                className="h-9 px-4 text-xs font-semibold text-[#8C7A6B]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={assignLoading}
                onClick={handleSaveAssignments}
                className="btn-primary h-9 px-5 text-xs font-bold text-white rounded-xl cursor-pointer"
              >
                {assignLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Member Roster
              </Button>
            </div>
          </div>
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
                  Remove Coach
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#33281E]">
                  Are you sure you want to remove <strong className="text-[#33281E]">{trainerName}</strong> from your gym coaching roster?
                </p>
                {memberCount > 0 && (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                    ⚠️ This coach currently has {memberCount} athlete{memberCount === 1 ? "" : "s"} assigned. Their assigned athletes will become unassigned.
                  </p>
                )}
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
