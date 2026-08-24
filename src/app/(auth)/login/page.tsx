"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import {
  Loader2,
  Lock,
  Mail,
  Building2,
  Dumbbell,
  User,
  QrCode,
  Sparkles,
  ShieldCheck,
  IdCard,
} from "lucide-react";
import { loginSchema } from "@/lib/validations";

type LoginRole = "GYM" | "TRAINER" | "MEMBER";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");

  const [activeRole, setActiveRole] = useState<LoginRole>("GYM");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: identifier.trim(),
        password: password,
        redirect: false,
      });

      if (res?.error) {
        setError(
          res.error === "CredentialsSignin"
            ? "Invalid login credentials. Please check your details and try again."
            : res.error
        );
        setLoading(false);
        return;
      }

      // Fetch active session to determine accurate role landing portal
      const session = await getSession();
      let targetUrl = rawCallback;

      if (!targetUrl || targetUrl === "/" || targetUrl === "/dashboard" || targetUrl === "/login") {
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

      router.push(targetUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }


  return (
    <div className="w-full max-w-lg space-y-6">
      {/* 3-Role Persona Selector */}
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

      {/* Main Form Card */}
      <div className="rounded-3xl border border-[#E5D9C5] bg-white p-8 md:p-10 shadow-[0_12px_40px_rgba(51,40,30,0.06)]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F9F8F6] border border-[#E5D9C5] text-[#8B5E34]">
            {activeRole === "GYM" && <Building2 className="h-5 w-5 text-[#8B5E34]" />}
            {activeRole === "TRAINER" && <Dumbbell className="h-5 w-5 text-[#8B5E34]" />}
            {activeRole === "MEMBER" && <QrCode className="h-5 w-5 text-[#8B5E34]" />}
          </div>

          <h1 className="font-display text-2xl font-bold text-[#33281E] md:text-3xl">
            {activeRole === "GYM" && "Gym Workspace Login"}
            {activeRole === "TRAINER" && "Trainer Portal Login"}
            {activeRole === "MEMBER" && "Gym Member Login"}
          </h1>
          <p className="mt-1.5 text-xs text-[#8C7A6B]">
            {activeRole === "GYM" && "Full administrative control over your gym"}
            {activeRole === "TRAINER" && "Manage assigned clients, workout routines & diet charts"}
            {activeRole === "MEMBER" && "Access your digital QR pass, workouts & diet plans"}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
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
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
            {loading
              ? "Authenticating credentials…"
              : activeRole === "GYM"
              ? "Access Gym Console"
              : activeRole === "TRAINER"
              ? "Access Trainer Portal"
              : "Access Member Passport"}
          </button>
        </form>

        {activeRole === "GYM" ? (
          <p className="mt-6 text-center text-xs text-[#8C7A6B]">
            New facility owner?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#8B5E34] transition-colors hover:underline"
            >
              Provision a new XYRO workspace
            </Link>
          </p>
        ) : (
          <div className="mt-6 rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-3 text-center text-xs text-[#8C7A6B]">
            <p>
              {activeRole === "MEMBER"
                ? "Member credentials and digital QR passes are provisioned by your gym reception desk."
                : "Trainer credentials are issued by your gym administrator."}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
