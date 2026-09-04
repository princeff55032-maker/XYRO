"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import {
  requestPasswordResetOtpAction,
  resendPasswordResetOtpAction,
  resetPasswordWithOtpAction,
} from "./actions";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step management: 1 = Enter Email, 2 = Enter OTP & New Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password criteria evaluation
  const passwordCriteria = useMemo(() => {
    return {
      minLength: password.length >= 12,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.minLength) score += 1;
    if (passwordCriteria.hasUpper) score += 1;
    if (passwordCriteria.hasLower) score += 1;
    if (passwordCriteria.hasNumber) score += 1;
    if (passwordCriteria.hasSpecial) score += 1;
    return score;
  }, [passwordCriteria]);

  const strengthLabel = useMemo(() => {
    if (!password) return { text: "Too weak", color: "bg-zinc-300", textCol: "text-[#8C7A6B]" };
    if (strengthScore <= 2) return { text: "Weak", color: "bg-red-500", textCol: "text-red-600" };
    if (strengthScore === 3) return { text: "Fair", color: "bg-amber-500", textCol: "text-amber-700" };
    if (strengthScore === 4) return { text: "Good", color: "bg-blue-500", textCol: "text-blue-700" };
    return { text: "Strong", color: "bg-emerald-600", textCol: "text-emerald-700" };
  }, [password, strengthScore]);

  // Resend countdown timer
  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, countdown]);

  // Focus first OTP input when step 2 opens
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Step 1: Submit Email to request OTP
  async function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetOtpAction(email);
      if (!res.ok) {
        setError(res.error || "Failed to send reset instructions.");
        setLoading(false);
        return;
      }

      setMaskedEmail(res.maskedEmail || email);
      setStep(2);
      setCountdown(60);
      setError(null);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");

    if (numericValue.length > 1) {
      handleOtpPaste(numericValue);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);
    setError(null);

    // Auto advance
    if (numericValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (pastedText: string) => {
    const cleanDigits = pastedText.replace(/[^0-9]/g, "").slice(0, 6);
    if (!cleanDigits) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = cleanDigits[i] || "";
    }
    setOtp(newOtp);

    const focusIdx = Math.min(cleanDigits.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // Step 2: Submit OTP and new password
  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fullCode = otp.join("");
    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    if (strengthScore < 5) {
      setError("Please satisfy all password complexity requirements (minimum 12 characters, uppercase, lowercase, number, and symbol).");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithOtpAction({
        email,
        code: fullCode,
        password,
        confirmPassword,
      });

      if (!res.ok) {
        setError(res.error || "Failed to reset password. Please check your verification code.");
        setLoading(false);
        return;
      }

      setStep(3);
      setTimeout(() => {
        router.push("/login?reset=true");
      }, 2000);
    } catch {
      setError("Something went wrong while resetting your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP handler
  async function onResendOtp() {
    if (countdown > 0 || resending || !email.trim()) return;

    setResending(true);
    setError(null);
    try {
      const res = await resendPasswordResetOtpAction(email);
      if (!res.ok) {
        setError(res.error || "Failed to resend code.");
      } else {
        setCountdown(60);
        setError(null);
      }
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  // Step 3: Success View
  if (step === 3) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-8 md:p-10 text-center shadow-[0_12px_40px_rgba(51,40,30,0.06)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-[#33281E]">
          Password Reset Successfully!
        </h1>
        <p className="mt-2 text-sm text-[#8C7A6B]">
          Your account password has been updated. Redirecting you to sign in...
        </p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#8B5E34]" />
        </div>
        <div className="mt-6">
          <Link
            href="/login"
            className="btn-primary inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-[0_4px_18px_rgba(139,94,52,0.22)]"
          >
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  // Step 2: OTP Verification & New Password
  if (step === 2) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-[#E5D9C5] bg-white p-8 md:p-10 shadow-[0_12px_40px_rgba(51,40,30,0.06)]">
        <button
          type="button"
          onClick={() => {
            setStep(1);
            setError(null);
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7A6B] transition-colors hover:text-[#8B5E34] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Change email
        </button>

        <div className="mt-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EFEA] text-[#8B5E34]">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-[#33281E]">
            Enter Reset Code
          </h1>
          <p className="mt-2 text-sm text-[#8C7A6B]">
            We sent a 6-digit OTP code to
          </p>
          <p className="font-semibold text-[#8B5E34] text-sm truncate">
            {maskedEmail || email}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onResetPassword} className="mt-8 space-y-6">
          {/* 6-Digit OTP Box Grid */}
          <div>
            <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-wider text-[#8C7A6B]">
              6-Digit Code
            </label>
            <div
              className="flex justify-center gap-2 sm:gap-2.5"
              onPaste={(e) => {
                e.preventDefault();
                handleOtpPaste(e.clipboardData.getData("text"));
              }}
            >
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  disabled={loading}
                  className="h-13 w-10 sm:h-14 sm:w-12 rounded-xl border-2 border-[#E5D9C5] bg-[#F9F8F6] text-center font-mono text-xl font-bold text-[#33281E] outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-4 focus:ring-[#8B5E34]/15 disabled:opacity-50"
                />
              ))}
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              New Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] pl-10 pr-10 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-2 focus:ring-[#8B5E34]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#33281E]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="mt-2.5 space-y-2 rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8C7A6B]">Password Strength</span>
                  <span className={`font-semibold ${strengthLabel.textCol}`}>
                    {strengthLabel.text}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 rounded-full transition-colors ${
                        strengthScore >= level ? strengthLabel.color : "bg-zinc-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                  <div className={`flex items-center gap-1 ${passwordCriteria.minLength ? "text-emerald-700 font-medium" : "text-[#8C7A6B]"}`}>
                    {passwordCriteria.minLength ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3" />}
                    <span>12+ chars</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.hasUpper ? "text-emerald-700 font-medium" : "text-[#8C7A6B]"}`}>
                    {passwordCriteria.hasUpper ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3" />}
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.hasLower ? "text-emerald-700 font-medium" : "text-[#8C7A6B]"}`}>
                    {passwordCriteria.hasLower ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3" />}
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.hasNumber ? "text-emerald-700 font-medium" : "text-[#8C7A6B]"}`}>
                    {passwordCriteria.hasNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3" />}
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.hasSpecial ? "text-emerald-700 font-medium" : "text-[#8C7A6B]"}`}>
                    {passwordCriteria.hasSpecial ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3" />}
                    <span>Special (!@#$)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] pl-10 pr-10 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-2 focus:ring-[#8B5E34]/15"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#33281E]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join("").length !== 6 || strengthScore < 5 || password !== confirmPassword}
            className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_4px_18px_rgba(139,94,52,0.22)] transition-all hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset Password
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
                onClick={onResendOtp}
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
                    Didn&apos;t receive code? Resend OTP
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  // Step 1: Request OTP by Email
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
        <h1 className="font-display text-3xl font-bold text-[#33281E]">Reset password</h1>
        <p className="mt-2 text-sm text-[#8C7A6B]">
          Enter your account email and we&apos;ll send you an OTP to reset your password.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onRequestOtp} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gym.com"
              className="h-11 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] pl-10 pr-4 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-2 focus:ring-[#8B5E34]/15"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_4px_18px_rgba(139,94,52,0.22)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Send verification code
        </button>
      </form>
    </div>
  );
}
