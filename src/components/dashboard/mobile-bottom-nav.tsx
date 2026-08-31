"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  CreditCard,
  Menu,
  X,
  UserPlus,
  Calendar,
  BadgePercent,
  Dumbbell,
  Salad,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const mainNavItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/members", label: "Members", icon: Users },
    { href: "/attendance", label: "Scan QR", icon: ScanLine, highlight: true },
    { href: "/payments", label: "Payments", icon: CreditCard },
  ];

  const moreItems = [
    { href: "/leads", label: "Leads", icon: UserPlus, desc: "Trial inquiries & pipeline" },
    { href: "/classes", label: "Classes & Schedule", icon: Calendar, desc: "Timetables & capacities" },
    { href: "/plans", label: "Membership Plans", icon: BadgePercent, desc: "Pricing rate cards" },
    { href: "/trainers", label: "Trainers & Coaches", icon: Dumbbell, desc: "Staff & assignments" },
    { href: "/workouts", label: "Workouts & Diets", icon: Salad, desc: "Training splits & nutrition" },
    { href: "/settings", label: "Gym Settings", icon: Settings, desc: "Branding, UPI & security" },
  ];

  return (
    <>
      {/* Mobile Slide-Up Drawer Menu */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="relative z-10 rounded-t-3xl border-t border-[#E5D9C5] bg-white p-5 pb-8 shadow-2xl animate-fade-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-3 mb-4">
              <div>
                <h3 className="font-display text-base font-bold text-[#33281E]">
                  Facility Navigation
                </h3>
                <p className="text-xs text-[#8C7A6B]">Quick access to all operations</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F9F8F6] text-[#8C7A6B] hover:text-[#33281E] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col rounded-2xl border p-3 transition ${
                      active
                        ? "border-[#8B5E34] bg-[#8B5E34]/5 text-[#8B5E34]"
                        : "border-[#E5D9C5] bg-[#F9F8F6] text-[#33281E] hover:bg-[#F3EFEA]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${active ? "bg-[#8B5E34] text-white" : "bg-white text-[#8B5E34] border border-[#E5D9C5]"}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-bold text-xs">{item.label}</span>
                    </div>
                    <span className="mt-1 text-[10px] text-[#8C7A6B] line-clamp-1">{item.desc}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-[#E5D9C5]">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/50 py-3 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of Gym</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-[#E5D9C5] bg-white/95 px-2 backdrop-blur-md shadow-[0_-4px_20px_rgba(51,40,30,0.05)]">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8B5E34] text-white shadow-md shadow-[#8B5E34]/25 active:scale-95 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="mt-0.5 text-[9px] font-mono font-bold text-[#8B5E34]">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors ${
                isActive ? "text-[#8B5E34]" : "text-[#8C7A6B] hover:text-[#33281E]"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className={`mt-0.5 text-[10px] font-medium font-mono ${isActive ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* 5th Button: More Menu */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors cursor-pointer ${
            moreOpen ? "text-[#8B5E34]" : "text-[#8C7A6B] hover:text-[#33281E]"
          }`}
        >
          <Menu className="h-4.5 w-4.5 stroke-2" />
          <span className="mt-0.5 text-[10px] font-medium font-mono">
            More
          </span>
        </button>
      </nav>
    </>
  );
}
