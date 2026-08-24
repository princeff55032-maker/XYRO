"use client";

import { CheckCircle2, Database } from "lucide-react";

export function DesktopStatusBar({
  gymCode,
}: {
  gymCode?: string;
}) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 flex h-6 items-center justify-between border-t border-[#E5D9C5] bg-white/95 backdrop-blur-xl px-3 select-none text-[11px] font-medium text-[#8C7A6B] shadow-sm">
      {/* Left System State */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-emerald-800 font-semibold">
          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
          <span>Ready</span>
        </span>
        <span className="text-[#E5D9C5]">|</span>
        <span className="font-mono text-[10px] text-[#8B5E34] font-semibold">
          Workspace: {gymCode ?? "XYRO-001"}
        </span>
        <span className="hidden sm:inline text-[#E5D9C5]">|</span>
        <span className="hidden sm:inline text-[10px] text-[#8C7A6B]">
          Cluster: Secure Multi-Tenant
        </span>
      </div>

      {/* Right Engine & Diagnostics */}
      <div className="flex items-center gap-3">
        <span className="hidden md:flex items-center gap-1 text-[10px]">
          <Database className="h-2.5 w-2.5 text-[#8B5E34]" />
          <span>PostgreSQL 5432</span>
        </span>
        <span className="hidden md:inline text-[#E5D9C5]">|</span>
        <span className="hidden sm:inline font-mono text-[10px] text-[#8C7A6B]">
          Host: 127.0.0.1:3000
        </span>
        <span className="text-[#E5D9C5]">|</span>
        <span className="font-mono text-[10px] font-bold text-[#8B5E34]">
          v2.4.1 Studio
        </span>
      </div>
    </footer>
  );
}
