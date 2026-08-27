"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  BadgePercent,
  CreditCard,
  ScanLine,
  Dumbbell,
  Salad,
  Calendar,
  UserPlus,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const navSections = [
  {
    title: "OPERATIONS",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/members", label: "Members", icon: Users },
      { href: "/leads", label: "Leads CRM", icon: UserPlus },
      { href: "/classes", label: "Classes & Schedule", icon: Calendar },
    ],
  },
  {
    title: "RECORDS & COMMERCE",
    items: [
      { href: "/plans", label: "Membership Plans", icon: BadgePercent },
      { href: "/payments", label: "Payments Ledger", icon: CreditCard },
      { href: "/attendance", label: "Attendance Logs", icon: ScanLine },
    ],
  },
  {
    title: "COACHING & SYSTEM",
    items: [
      { href: "/trainers", label: "Trainers", icon: Dumbbell },
      { href: "/workouts", label: "Workouts & Diets", icon: Salad },
      { href: "/settings", label: "Gym Settings", icon: Settings },
    ],
  },
];

export function Sidebar({
  gymName,
  gymCode,
  userName,
  userRole,
}: {
  gymName?: string;
  gymCode?: string;
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-[#E5D9C5] bg-white select-none shadow-[2px_0_10px_rgba(51,40,30,0.02)]">
      {/* Workspace Quick Tag */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 py-2 shadow-xs">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#33281E]">{gymName ?? "Workspace"}</p>
            <p className="font-mono text-[10px] text-[#8B5E34] font-semibold truncate">{gymCode ?? "XYRO-001"}</p>
          </div>
        </div>

        {userRole === "SUPER_ADMIN" && (
          <Link
            href="/admin"
            className="mt-2 flex items-center justify-between rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-2.5 py-1.5 text-[11px] font-bold text-[#8B5E34] hover:bg-[#F3EFEA] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Platform Owner</span>
            </span>
            <span className="font-mono text-[9px] uppercase">Root</span>
          </Link>
        )}
      </div>

      {/* Navigation View List */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-2.5 py-2">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-2 pt-1 font-mono text-[10px] font-bold tracking-widest text-[#8C7A6B] uppercase">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer",
                    active
                      ? "bg-[#8B5E34] text-white font-bold shadow-sm"
                      : "text-[#8C7A6B] hover:bg-[#F9F8F6] hover:text-[#33281E]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      active ? "text-white" : "text-[#8C7A6B] group-hover:text-[#8B5E34]"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Dock Footer */}
      <div className="border-t border-[#E5D9C5] p-2.5 bg-white">
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 py-2 shadow-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B5E34] text-[11px] font-bold text-white shadow-xs">
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#33281E]">{userName}</p>
            <p className="truncate font-mono text-[9px] uppercase text-[#8B5E34] font-semibold">{userRole.replace("_", " ")}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="p-1 text-[#8C7A6B] hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
