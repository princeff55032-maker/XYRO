"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MemberQrPass({
  memberId,
  memberName,
  gymName,
  gymCode,
  planName,
  isValid,
}: {
  memberId: string;
  memberName: string;
  gymName: string;
  gymCode: string;
  planName?: string;
  isValid: boolean;
}) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    // Generate QR payload containing member identifier
    const payload = JSON.stringify({
      id: memberId,
      gym: gymCode,
      ts: Date.now(),
    });

    QRCode.toDataURL(payload, {
      width: 260,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url: string) => setQrUrl(url))
      .catch((err: unknown) => console.error("QR gen error:", err));
  }, [memberId, gymCode]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white p-6 md:p-8 shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
      <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <span className="font-mono text-xs font-bold text-[#8B5E34]">
              {gymName} · {gymCode}
            </span>
            <Badge
              variant={isValid ? "success" : "destructive"}
              className="text-[10px]"
            >
              {isValid ? "Active Membership Pass" : "Pass Inactive"}
            </Badge>
          </div>

          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#33281E] md:text-3xl">
            {memberName}
          </h2>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-[#8C7A6B] md:justify-start">
            <span className="font-mono font-bold text-[#8B5E34]">{memberId}</span>
            <span>•</span>
            <span className="font-semibold text-[#33281E]">
              {planName ?? "Standard Pass"}
            </span>
          </div>

          <p className="mt-4 max-w-sm text-xs leading-relaxed text-[#8C7A6B]">
            Show this digital pass at the gym front desk or kiosk scanner to check in
            instantly without touch.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-[#E5D9C5] bg-white p-3 shadow-md">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Member Check-in QR"
                className="h-full w-full object-contain"
              />
            ) : (
              <QrCode className="h-16 w-16 animate-pulse text-[#8C7A6B]" />
            )}
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-[#8C7A6B]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            Touchless Biometric Pass
          </span>
        </div>
      </div>
    </div>
  );
}
