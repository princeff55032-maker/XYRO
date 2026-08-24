"use client";

import { signOut } from "next-auth/react";
import { LogOut, Crown } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function AdminNav({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-semibold text-[#33281E]">{userName}</p>
        <p className="text-[10px] font-medium text-[#8B5E34]">Master Super Admin</p>
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5E34] font-display text-xs font-bold text-white shadow-sm">
        {getInitials(userName)}
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5D9C5] bg-[#F9F8F6] text-[#8C7A6B] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
        title="Sign Out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
