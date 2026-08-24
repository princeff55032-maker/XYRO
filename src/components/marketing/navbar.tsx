"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "#features", label: "Floor Operations" },
  { href: "#platform", label: "Architecture" },
  { href: "#pricing", label: "Rate Cards" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-in-out",
        scrolled ? "py-3" : "py-5 md:py-6"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5">
        <div
          className={cn(
            "flex w-full items-center justify-between rounded-full px-6 py-3 transition-all duration-300 ease-in-out bg-white border border-[#E5D9C5]",
            scrolled
              ? "shadow-[0_8px_30px_rgba(51,40,30,0.06)]"
              : "shadow-[0_4px_20px_rgba(51,40,30,0.04)]"
          )}
        >
          <Link href="/" className="shrink-0 transition-transform duration-300 hover:scale-105">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs font-semibold tracking-wider text-[#8C7A6B] uppercase transition-all duration-300 hover:text-[#33281E] hover:-translate-y-0.5"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3.5 md:flex">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-xs font-semibold text-[#8C7A6B] transition-all duration-300 hover:text-[#33281E] hover:bg-[#F3EFEA] hover:-translate-y-0.5"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-primary inline-flex h-9 items-center rounded-full px-5 text-xs font-semibold text-white transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0"
            >
              Start Your Gym
            </Link>
          </div>

          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5D9C5] bg-[#F9F8F6] text-[#33281E] transition-all duration-300 hover:border-[#8B5E34] hover:text-[#8B5E34] md:hidden cursor-pointer"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto mt-2 w-[calc(100%-2.5rem)] max-w-6xl md:hidden">
          <div className="flex flex-col gap-1.5 rounded-3xl border border-[#E5D9C5] bg-white p-5 shadow-[0_12px_36px_rgba(51,40,30,0.08)]">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-[#33281E] transition-colors hover:bg-[#F3EFEA] hover:text-[#8B5E34]"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex gap-3 pt-3 border-t border-[#E5D9C5]">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="btn-ghost flex h-11 flex-1 items-center justify-center rounded-full text-xs font-semibold text-[#33281E]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="btn-primary flex h-11 flex-1 items-center justify-center rounded-full text-xs font-semibold text-white"
              >
                Start Your Gym
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
