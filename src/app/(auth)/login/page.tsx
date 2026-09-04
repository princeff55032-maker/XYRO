"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useRef, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import {
  Loader2,
  Lock,
  Mail,
  Building2,
  Dumbbell,
  User,
  QrCode,
  ShieldCheck,
  IdCard,
  ArrowLeft,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { requestLoginOtpAction, resendLogin2faOtpAction } from "./actions";

type LoginRole = "GYM" | "TRAINER" | "MEMBER";
type AuthMethod = "PASSWORD" | "OTP";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const isVerified = searchParams.get("verified") === "true";
  const isReset = searchParams.get("reset") === "true";

  const [activeRole, setActiveRole] = useState<LoginRole>("GYM");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("PASSWORD");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OTP Login State
  const [otpStep, setOtpStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [loginChallengeToken, setLoginChallengeToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (authMethod === "OTP" && otpStep === "VERIFY") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [authMethod, otpStep]);

  useEffect(() => {
    if (countdown <= 0 || authMethod !== "OTP" || otpStep !== "VERIFY") return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown, authMethod, otpStep]);

  // Handle direct login with Password
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);

    if (!identifier.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: identifier.trim(),
        password,
        portalRole: activeRole,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error === "CredentialsSignin" ? "Invalid login credentials." : res.error);
        setLoading(false);
        return;
      }

      await handleRedirectAfterLogin();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Handle Requesting OTP Code
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);

    if (!identifier.trim()) {
      setError("Please enter your email, phone, or Member ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestLoginOtpAction({
        identifier: identifier.trim(),
        portalRole: activeRole,
      });

      if (!res.ok) {
        setError(res.error || "Failed to send OTP code.");
        if (res.unverifiedEmail) {
          setUnverifiedEmail(res.unverifiedEmail);
        }
        setLoading(false);
        return;
      }

      setLoginChallengeToken(res.loginChallengeToken || "");
      setMaskedEmail(res.maskedEmail || res.email || identifier);
      setOtp(["", "", "", "", "", ""]);
      setCountdown(60);
      setOtpStep("VERIFY");
      setLoading(false);
    } catch {
      setError("Failed to request login code. Please try again.");
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

    if (numericValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && numericValue) {
      const fullCode = newOtp.join("");
      if (fullCode.length === 6) {
        handleOtpSubmit(fullCode);
      }
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

    if (cleanDigits.length === 6) {
      handleOtpSubmit(cleanDigits);
    }
  };

  // Submit OTP Verification
  async function handleOtpSubmit(code: string) {
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        loginChallengeToken,
        otp: code,
        portalRole: activeRole,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error === "CredentialsSignin" ? "Invalid verification code." : res.error);
        setLoading(false);
        return;
      }

      await handleRedirectAfterLogin();
    } catch {
      setError("Failed to verify login code. Please try again.");
      setLoading(false);
    }
  }

  // Handle Resend OTP
  async function handleResendOtp() {
    if (countdown > 0 || resending || !loginChallengeToken) return;

    setResending(true);
    setError(null);

    try {
      const res = await resendLogin2faOtpAction({ loginChallengeToken });
      if (!res.ok) {
        setError(res.error || "Failed to resend code.");
      } else {
        setCountdown(60);
      }
    } catch {
      setError("Failed to resend code.");
    } finally {
      setResending(false);
    }
  }

  // Helper to determine destination route after successful auth
  async function handleRedirectAfterLogin() {
    const session = await getSession();
    let targetUrl = rawCallback;

    if (
      !targetUrl ||
      targetUrl === "/" ||
      targetUrl === "/dashboard" ||
      targetUrl === "/login" ||
      targetUrl.startsWith("/login")
    ) {
      if (session?.user?.role === "SUPER_ADMIN") {
        targetUrl = "/admin";
      } else if (session?.user?.role === "TRAINER" || activeRole === "TRAINER") {
        targetUrl = "/trainer";
      } else if (session?.user?.role === "CUSTOMER" || activeRole === "MEMBER") {
        targetUrl = "/member";
      } else {
        targetUrl = "/dashboard";
      }
    }

    window.location.href = targetUrl;
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* 3-Role Persona Selector */}
      {!(authMethod === "OTP" && otpStep === "VERIFY") && (
        <div className="rounded-2xl border border-[#E5D9C5] bg-white p-1.5 shadow-[0_4px_20px_rgba(51,40,30,0.04)]">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveRole("GYM");
                setError(null);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-2 text-center transition-all cursor-pointer ${
                activeRole === "GYM"
                  ? "bg-[#8B5E34] text-white font-semibold shadow-md"
                  : "text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E]"
              }`}
            >
              <Building2 className="h-4.5 w-4.5" />
              <span className="text-xs font-semibold">Gym Admin</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRole("TRAINER");
                setError(null);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-2 text-center transition-all cursor-pointer ${
                activeRole === "TRAINER"
                  ? "bg-[#8B5E34] text-white font-semibold shadow-md"
                  : "text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E]"
              }`}
            >
              <Dumbbell className="h-4.5 w-4.5" />
              <span className="text-xs font-semibold">Trainer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveRole("MEMBER");
                setError(null);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-2 text-center transition-all cursor-pointer ${
                activeRole === "MEMBER"
                  ? "bg-[#8B5E34] text-white font-semibold shadow-md"
                  : "text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E]"
              }`}
            >
              <User className="h-4.5 w-4.5" />
              <span className="text-xs font-semibold">Gym Member</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="rounded-3xl border border-[#E5D9C5] bg-white p-8 md:p-10 shadow-[0_12px_40px_rgba(51,40,30,0.06)]">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F9F8F6] border border-[#E5D9C5] text-[#8B5E34]">
            {authMethod === "OTP" && otpStep === "VERIFY" ? (
              <KeyRound className="h-5 w-5 text-[#8B5E34]" />
            ) : (
              <>
                {activeRole === "GYM" && <Building2 className="h-5 w-5 text-[#8B5E34]" />}
                {activeRole === "TRAINER" && <Dumbbell className="h-5 w-5 text-[#8B5E34]" />}
                {activeRole === "MEMBER" && <QrCode className="h-5 w-5 text-[#8B5E34]" />}
              </>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-[#33281E] md:text-3xl">
            {authMethod === "OTP" && otpStep === "VERIFY" ? (
              "Enter Verification Code"
            ) : (
              <>
                {activeRole === "GYM" && "Gym Workspace Login"}
                {activeRole === "TRAINER" && "Trainer Portal Login"}
                {activeRole === "MEMBER" && "Gym Member Login"}
              </>
            )}
          </h1>
          <p className="mt-1.5 text-xs text-[#8C7A6B]">
            {authMethod === "OTP" && otpStep === "VERIFY" ? (
              <>
                We sent a 6-digit login code to{" "}
                <strong className="text-[#8B5E34]">{maskedEmail}</strong>
              </>
            ) : (
              <>
                {activeRole === "GYM" && "Full administrative control over your gym"}
                {activeRole === "TRAINER" && "Manage assigned clients, workout routines & diet charts"}
                {activeRole === "MEMBER" && "Access your digital QR pass, workouts & diet plans"}
              </>
            )}
          </p>
        </div>

        {/* Banners */}
        {isVerified && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 text-center font-medium">
            ✅ Your email has been verified! You can now log in.
          </div>
        )}

        {isReset && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 text-center font-medium">
            ✅ Password reset successfully! Please sign in with your new password.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
            {unverifiedEmail && (
              <div className="mt-2">
                <Link
                  href={`/verify-otp?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="font-bold underline text-red-800 hover:text-red-900"
                >
                  Click here to enter your 6-digit verification code →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* AUTH METHOD SELECTOR TABS (Password vs OTP) */}
        {!(authMethod === "OTP" && otpStep === "VERIFY") && (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-[#F9F8F6] p-1 border border-[#E5D9C5]">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("PASSWORD");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
                authMethod === "PASSWORD"
                  ? "bg-white text-[#8B5E34] shadow-xs border border-[#E5D9C5]"
                  : "text-[#8C7A6B] hover:text-[#33281E]"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Login with Password</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMethod("OTP");
                setError(null);
                setOtpStep("REQUEST");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
                authMethod === "OTP"
                  ? "bg-white text-[#8B5E34] shadow-xs border border-[#E5D9C5]"
                  : "text-[#8C7A6B] hover:text-[#33281E]"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Login with OTP</span>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* OPTION 1: PASSWORD LOGIN FORM                                 */}
        {/* ------------------------------------------------------------- */}
        {authMethod === "PASSWORD" && (
          <form onSubmit={handlePasswordLogin} className="mt-6 space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-xs font-semibold text-[#33281E]">
                {activeRole === "GYM" && "Admin Email"}
                {activeRole === "TRAINER" && "Trainer Email or Phone"}
                {activeRole === "MEMBER" && "Member ID or Email"}
              </label>
              <div className="relative">
                {activeRole === "MEMBER" ? (
                  <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
                ) : (
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
                )}
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    activeRole === "GYM"
                      ? "admin@gym.com"
                      : activeRole === "TRAINER"
                      ? "coach@gym.com or +91 98765 43210"
                      : "GYM_001-M-000001 or member@email.com"
                  }
                  className="h-11 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] pl-10 pr-4 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-2 focus:ring-[#8B5E34]/15"
                />
              </div>
              {activeRole === "MEMBER" && (
                <p className="mt-1 text-[11px] text-[#8C7A6B]">
                  Tip: You can use your Member ID printed on your gym slip / welcome card.
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-[#33281E]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-[#8C7A6B] transition-colors hover:text-[#8B5E34]"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] pl-10 pr-10 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-2 focus:ring-[#8B5E34]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#33281E] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_4px_18px_rgba(139,94,52,0.22)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing In…" : "Sign In with Password"}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* OPTION 2: OTP LOGIN (Step 1: Request OTP)                    */}
        {/* ------------------------------------------------------------- */}
        {authMethod === "OTP" && otpStep === "REQUEST" && (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-5">
            <div>
              <label htmlFor="otp-identifier" className="mb-1.5 block text-xs font-semibold text-[#33281E]">
                {activeRole === "GYM" && "Admin Email"}
                {activeRole === "TRAINER" && "Trainer Email or Phone"}
                {activeRole === "MEMBER" && "Member ID or Email"}
              </label>
              <div className="relative">
                {activeRole === "MEMBER" ? (
                  <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
                ) : (
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7A6B]" />
                )}
                <input
                  id="otp-identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    activeRole === "GYM"
                      ? "admin@gym.com"
                      : activeRole === "TRAINER"
                      ? "coach@gym.com or +91 98765 43210"
                      : "GYM_001-M-000001 or member@email.com"
                  }
                  className="h-11 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] pl-10 pr-4 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-2 focus:ring-[#8B5E34]/15"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#8C7A6B]">
                We will send an instant 6-digit login code to your registered email address.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_4px_18px_rgba(139,94,52,0.22)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending Code…" : "Send Login OTP Code →"}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* OPTION 2: OTP LOGIN (Step 2: Enter 6-digit OTP Code)         */}
        {/* ------------------------------------------------------------- */}
        {authMethod === "OTP" && otpStep === "VERIFY" && (
          <div className="mt-6 space-y-6">
            <button
              type="button"
              onClick={() => {
                setOtpStep("REQUEST");
                setError(null);
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#8C7A6B] hover:text-[#8B5E34] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Change email / identifier
            </button>

            {/* 6-Digit OTP Box Grid */}
            <div>
              <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-wider text-[#8C7A6B]">
                6-Digit Login Code
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

            <button
              type="button"
              onClick={() => handleOtpSubmit(otp.join(""))}
              disabled={loading || otp.join("").length !== 6}
              className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_4px_18px_rgba(139,94,52,0.22)] transition-all hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Verifying…" : "Verify & Sign In"}
            </button>

            {/* Resend Code Section */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-xs text-[#8C7A6B]">
                  Resend login code in{" "}
                  <strong className="font-mono text-[#33281E]">{countdown}s</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
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
          </div>
        )}

        {/* Google Single Sign-On specifically for Gym Administrators */}
        {activeRole === "GYM" && !(authMethod === "OTP" && otpStep === "VERIFY") && (
          <div className="mt-5">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5D9C5]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[10px] font-mono font-bold text-[#8C7A6B]">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#E5D9C5] bg-white text-xs font-bold text-[#33281E] shadow-xs hover:border-[#8B5E34] hover:bg-[#FAF9F7] transition cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {activeRole === "GYM" && !(authMethod === "OTP" && otpStep === "VERIFY") && (
          <p className="mt-6 text-center text-xs text-[#8C7A6B]">
            New facility owner?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#8B5E34] transition-colors hover:underline"
            >
              Provision a new XYRO workspace
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#8B5E34]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
