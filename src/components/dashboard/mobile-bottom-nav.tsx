"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  CreditCard,
  Settings,
} from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/members", label: "Athletes", icon: Users },
    { href: "/attendance", label: "Scan QR", icon: ScanLine, highlight: true },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-[#E5D9C5] bg-white/95 px-2 backdrop-blur-md shadow-[0_-4px_20px_rgba(51,40,30,0.05)]">
      {navItems.map((item) => {
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
    </div>
  );
}
