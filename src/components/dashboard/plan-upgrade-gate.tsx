"use client";

import Link from "next/link";
import { Sparkles, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlanUpgradeGateProps {
  featureName: string;
  requiredTier: "Starter" | "Pro" | "Business";
  requiredPrice: string;
  description: string;
  highlights: string[];
}

export function PlanUpgradeGate({
  featureName,
  requiredTier,
  requiredPrice,
  description,
  highlights,
}: PlanUpgradeGateProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#E5D9C5] bg-gradient-to-br from-white via-[#FAF9F7] to-[#F3EFEA] p-8 md:p-12 text-center shadow-[0_4px_30px_rgba(51,40,30,0.04)]">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5E34]/10 text-[#8B5E34]">
          <Lock className="h-7 w-7" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[#E5D9C5] bg-white px-3 py-1 text-xs font-mono font-bold text-[#8B5E34]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Requires {requiredTier} Tier ({requiredPrice})</span>
        </div>

        <h2 className="font-display text-2xl md:text-3xl font-bold text-[#33281E]">
          Unlock {featureName}
        </h2>

        <p className="text-xs md:text-sm text-[#8C7A6B] leading-relaxed">
          {description}
        </p>

        <div className="my-6 grid gap-2.5 sm:grid-cols-2 text-left">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-[#E5D9C5] bg-white p-3 text-xs font-medium text-[#33281E]"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{h}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/settings">
            <Button className="btn-primary h-11 px-7 rounded-xl text-xs font-bold text-white shadow-md">
              <span>Upgrade in Settings</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="h-11 px-5 rounded-xl text-xs border-[#E5D9C5]">
              Back to Overview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
