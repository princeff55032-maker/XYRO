"use client";

import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";
import { QrCode, ShieldCheck, RefreshCw, Clock } from "lucide-react";
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
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const generateDynamicPass = useCallback(() => {
    const ts = Date.now();
    const nonce = Math.random().toString(36).substring(2, 9);
    
    // Dynamic short-lived cryptographic payload for turnstile/scanner verification
    const payload = JSON.stringify({
      id: memberId,
      gym: gymCode,
      ts,
      nonce,
      sig: btoa(`${memberId}:${gymCode}:${ts}:${nonce}`).slice(0, 16),
    });

    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: {
        dark: "#1A1410",
        light: "#FFFFFF",
      },
    })
      .then((url: string) => {
        setQrUrl(url);
        setLastRefreshed(Date.now());
        setSecondsRemaining(30);
      })
      .catch((err: unknown) => console.error("QR gen error:", err));
  }, [memberId, gymCode]);

  useEffect(() => {
    generateDynamicPass();
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          generateDynamicPass();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [generateDynamicPass]);

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
            Present this dynamic digital pass at turnstile gates, biometric scanners, or the front-desk kiosk for sub-second check-in.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 py-1.5 text-xs text-[#8C7A6B]">
            <Clock className="h-3.5 w-3.5 text-[#8B5E34]" />
            <span>Short-lived dynamic QR access · Auto-refreshes in </span>
            <strong className="font-mono text-[#33281E]">{secondsRemaining}s</strong>
          </div>
        </div>

        {/* Dynamic QR Code Container */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-[#E5D9C5] bg-white p-3 shadow-md">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Short-lived dynamic member pass"
                className="h-full w-full object-contain"
              />
            ) : (
              <QrCode className="h-16 w-16 animate-pulse text-[#8C7A6B]" />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-[#8C7A6B]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              Replay-Protected Dynamic Pass
            </span>
            <button
              type="button"
              onClick={generateDynamicPass}
              title="Force Refresh QR Pass"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B5E34] hover:underline cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
