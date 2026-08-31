"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { QrCode, ShieldCheck, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSignedMemberQrPassAction } from "./actions";

export function MemberQrPass({
  memberId,
  memberName,
  gymName,
  gymCode,
  planName,
  isValid: initialValid,
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
  const [isValid, setIsValid] = useState<boolean>(initialValid);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchSignedPass = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setRefreshing(true);
    setError(null);

    try {
      const res = await getSignedMemberQrPassAction();
      if (res.ok) {
        setIsValid(res.isValid);
        const url = await QRCode.toDataURL(res.qrToken, {
          width: 280,
          margin: 1,
          color: {
            dark: "#1A1410",
            light: "#FFFFFF",
          },
        });
        setQrUrl(url);
        setSecondsRemaining(30);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Failed to refresh dynamic pass. Check network connection.");
    } finally {
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchSignedPass();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchSignedPass();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchSignedPass]);

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
            Present this dynamic digital pass at turnstile gates, biometric scanners, or the front-desk kiosk for instant cryptographic verification.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-3 py-1.5 text-xs text-[#8C7A6B]">
            <Clock className="h-3.5 w-3.5 text-[#8B5E34]" />
            <span>Cryptographic HMAC-SHA256 Token · Auto-refreshes in </span>
            <strong className="font-mono text-[#33281E]">{secondsRemaining}s</strong>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Dynamic QR Code Container */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-[#E5D9C5] bg-white p-3 shadow-md">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Cryptographically signed dynamic member pass"
                className="h-full w-full object-contain"
              />
            ) : (
              <QrCode className="h-16 w-16 animate-pulse text-[#8C7A6B]" />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-[#8C7A6B]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              Server-Signed Anti-Forgery Token
            </span>
            <button
              type="button"
              onClick={fetchSignedPass}
              disabled={refreshing}
              title="Force Refresh QR Pass"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B5E34] hover:underline cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
