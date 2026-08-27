"use client";

import { useState, useEffect } from "react";
import {
  Minus,
  Square,
  X,
  Search,
  Dumbbell,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export function DesktopTitleBar({
  gymName,
  gymCode,
}: {
  gymName?: string;
  gymCode?: string;
}) {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      setIsElectron(true);
    }
  }, []);

  const handleMinimize = () => {
    if (typeof window !== "undefined" && (window as any).electronAPI?.minimize) {
      (window as any).electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (typeof window !== "undefined" && (window as any).electronAPI?.maximize) {
      (window as any).electronAPI.maximize();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && (window as any).electronAPI?.close) {
      (window as any).electronAPI.close();
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-9 items-center justify-between border-b border-[#E5D9C5] bg-white/95 backdrop-blur-xl px-3 select-none text-xs font-medium text-[#33281E] shadow-sm">
      {/* Left: App Icon + App Name + Tenant Identifier */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[#8B5E34] text-white shadow-sm">
          <Dumbbell className="h-3 w-3" />
        </div>
        <span className="font-display font-bold text-xs text-[#33281E] tracking-tight truncate">
          XYRO Gym
        </span>
        <span className="text-[#E5D9C5] font-normal">|</span>
        <span className="truncate text-[11px] text-[#8B5E34] font-mono font-bold">
          {gymName ?? "Workspace"} ({gymCode ?? "XYRO-001"})
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[#E5D9C5] bg-[#F9F8F6] px-2 py-0.5 text-[9px] font-bold text-[#8B5E34] uppercase">
          Cloud Console
        </span>
      </div>

      {/* Center: Command Bar Quick Search */}
      <div className="hidden md:flex items-center gap-2 max-w-xs w-full mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#8C7A6B]" />
          <input
            type="text"
            readOnly
            placeholder="Search members, ledger, plans (Ctrl+K)..."
            onClick={() => {
              const el = document.querySelector('input[type="text"]:not([readonly])') as HTMLInputElement;
              if (el) el.focus();
            }}
            className="h-6 w-full rounded-md border border-[#E5D9C5] bg-[#F9F8F6] pl-8 pr-2 text-[11px] text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none cursor-pointer hover:border-[#8B5E34] hover:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1">

        {/* Windows Standard Window Action Buttons (Electron only) */}
        {isElectron && (
          <div className="flex items-center -mr-3 h-9">
            <button
              onClick={handleMinimize}
              className="flex h-9 w-11 items-center justify-center text-[#8C7A6B] transition-colors hover:bg-[#F3EFEA] hover:text-[#33281E] active:bg-[#EAE4DC] cursor-pointer"
              title="Minimize"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="flex h-9 w-11 items-center justify-center text-[#8C7A6B] transition-colors hover:bg-[#F3EFEA] hover:text-[#33281E] active:bg-[#EAE4DC] cursor-pointer"
              title={isMaximized ? "Restore Down" : "Maximize"}
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={handleClose}
              className="flex h-9 w-11 items-center justify-center text-[#8C7A6B] transition-colors hover:bg-red-500 hover:text-white active:bg-red-600 cursor-pointer"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
