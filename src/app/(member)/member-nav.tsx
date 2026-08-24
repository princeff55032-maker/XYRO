"use client";

import { signOut } from "next-auth/react";
import { LogOut, User, Shield } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function MemberNav({
  userName,
  userEmail,
  gymName,
}: {
  userName: string;
  userEmail?: string;
  gymName?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-bold text-[#33281E]">{userName}</p>
        <p className="text-[10px] text-[#8C7A6B]">{gymName ?? "Gym Member"}</p>
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5E34] font-display text-xs font-bold text-white shadow-xs">
        {getInitials(userName)}
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5D9C5] bg-white text-[#8C7A6B] transition hover:bg-red-50 hover:text-red-700 hover:border-red-200 cursor-pointer"
        title="Sign Out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
