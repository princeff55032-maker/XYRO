"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import { verifySignupOtpAction, resendSignupOtpAction } from "@/app/(auth)/register/actions";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    // Only accept numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");

    if (numericValue.length > 1) {
      // Handle multi-character paste into a single box
      handlePaste(numericValue);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);
    setError(null);

    // Auto advance to next input
    if (numericValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (index === 5 && numericValue) {
      const fullCode = newOtp.join("");
      if (fullCode.length === 6) {
        submitVerification(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (pastedText: string) => {
    const cleanDigits = pastedText.replace(/[^0-9]/g, "").slice(0, 6);
    if (!cleanDigits) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = cleanDigits[i] || "";
    }
    setOtp(newOtp);

    const focusIdx = Math.min(cleanDigits.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (cleanDigits.length === 6) {
      submitVerification(cleanDigits);
    }
  };

  const submitVerification = async (code: string) => {
    if (!email.trim()) {
      setError("Please provide your email address.");
      return;
    }
    if (code.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifySignupOtpAction({ email, code });
      if (!res.ok) {
        setError(res.error || "Invalid verification code.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?verified=true");
      }, 1500);
    } catch {
      setError("Something went wrong during verification. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending || !email.trim()) return;

    setResending(true);
    setError(null);

    try {
      const res = await resendSignupOtpAction(email);
      if (!res.ok) {
        setError(res.error || "Failed to resend verification code.");
      } else {
        setCountdown(60);
        setError(null);
      }
    } catch {
      setError("Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-8 md:p-10 text-center shadow-[0_12px_40px_rgba(51,40,30,0.06)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-[#33281E]">
          Email Verified Successfully!
        </h1>
        <p className="mt-2 text-sm text-[#8C7A6B]">
          Your account is now activated. Redirecting you to sign in...
        </p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#8B5E34]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-[#E5D9C5] bg-white p-8 md:p-10 shadow-[0_12px_40px_rgba(51,40,30,0.06)]">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7A6B] transition-colors hover:text-[#8B5E34]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>

      <div className="mt-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EFEA] text-[#8B5E34]">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-[#33281E]">
          Verify Your Email
        </h1>
        <p className="mt-2 text-sm text-[#8C7A6B]">
          We sent a 6-digit verification code to
        </p>
        <p className="font-semibold text-[#8B5E34] text-sm truncate">
          {email || "your email address"}
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-6">
        {/* 6-Digit OTP Box Grid */}
        <div
          className="flex justify-center gap-2 sm:gap-3"
          onPaste={(e) => {
            e.preventDefault();
            handlePaste(e.clipboardData.getData("text"));
          }}
        >
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={loading}
              className="h-14 w-11 sm:h-16 sm:w-13 rounded-2xl border-2 border-[#E5D9C5] bg-[#F9F8F6] text-center font-mono text-2xl font-bold text-[#33281E] outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-4 focus:ring-[#8B5E34]/15 disabled:opacity-50"
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => submitVerification(otp.join(""))}
          disabled={loading || otp.join("").length !== 6}
          className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_4px_18px_rgba(139,94,52,0.22)] transition-all hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify & Activate Account
        </button>

        {/* Resend Code Section */}
        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-xs text-[#8C7A6B]">
              Resend code available in{" "}
              <strong className="font-mono text-[#33281E]">{countdown}s</strong>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5E34] hover:underline cursor-pointer"
            >
              {resending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Didn&apos;t receive code? Resend
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B5E34]" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
