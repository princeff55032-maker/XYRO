"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Check, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { registerGymAction } from "./actions";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] px-4 text-sm text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition-all focus:border-[#8B5E34] focus:bg-white focus:ring-2 focus:ring-[#8B5E34]/15";


export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    gymName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    gstNumber: "",
    termsAccepted: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Password criteria evaluation
  const passwordCriteria = useMemo(() => {
    const pwd = form.password;
    return {
      minLength: pwd.length >= 12,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  }, [form.password]);

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
    if (!form.password) return { text: "Too weak", color: "bg-zinc-300", textCol: "text-[#8C7A6B]" };
    if (strengthScore <= 2) return { text: "Weak", color: "bg-red-500", textCol: "text-red-600" };
    if (strengthScore === 3) return { text: "Fair", color: "bg-amber-500", textCol: "text-amber-700" };
    if (strengthScore === 4) return { text: "Good", color: "bg-blue-500", textCol: "text-blue-700" };
    return { text: "Strong", color: "bg-emerald-600", textCol: "text-emerald-700" };
  }, [form.password, strengthScore]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (strengthScore < 5) {
      setError("Please satisfy all password complexity requirements (minimum 12 characters, uppercase, lowercase, number, and symbol).");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.termsAccepted) {
      setError("You must accept the terms of service.");
      return;
    }

    setLoading(true);

    const result = await registerGymAction(form);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Auto sign-in to the fresh workspace
    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    if (res?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-[#E5D9C5] bg-white p-8 md:p-10 shadow-[0_12px_40px_rgba(51,40,30,0.06)]">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-[#33281E]">
          Launch your gym on XYRO
        </h1>
        <p className="mt-2 text-sm text-[#8C7A6B]">
          Create your workspace — members, payments, attendance, trainers, and growth in one place.
        </p>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="gymName" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              Gym Name <span className="text-red-500">*</span>
            </label>
            <input
              id="gymName"
              required
              value={form.gymName}
              onChange={(e) => set("gymName", e.target.value)}
              placeholder="Iron Temple Fitness"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="ownerName" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              id="ownerName"
              required
              value={form.ownerName}
              onChange={(e) => set("ownerName", e.target.value)}
              placeholder="Aarav Sharma"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              required
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@gym.com"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-[#33281E]">
                Password <span className="text-red-500">*</span>
              </label>
              {form.password && (
                <span className={`text-xs font-semibold ${strengthLabel.textCol}`}>
                  Strength: {strengthLabel.text}
                </span>
              )}
            </div>
            <input
              id="password"
              required
              type="password"
              minLength={12}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Minimum 12 characters"
              className={inputCls}
            />

            {/* Password Strength Progress Bar */}
            {form.password && (
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      level <= strengthScore ? strengthLabel.color : "bg-[#E5D9C5]"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Criteria Checklist */}
            <div className="mt-3 grid grid-cols-1 gap-1.5 rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-3 text-xs sm:grid-cols-2">
              <div className={`flex items-center gap-1.5 ${passwordCriteria.minLength ? "text-emerald-700 font-semibold" : "text-[#8C7A6B]"}`}>
                {passwordCriteria.minLength ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>At least 12 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordCriteria.hasUpper && passwordCriteria.hasLower ? "text-emerald-700 font-semibold" : "text-[#8C7A6B]"}`}>
                {passwordCriteria.hasUpper && passwordCriteria.hasLower ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>Uppercase &amp; lowercase</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? "text-emerald-700 font-semibold" : "text-[#8C7A6B]"}`}>
                {passwordCriteria.hasNumber ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>At least one number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordCriteria.hasSpecial ? "text-emerald-700 font-semibold" : "text-[#8C7A6B]"}`}>
                {passwordCriteria.hasSpecial ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span>Special symbol (!@#$%^&*)</span>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              required
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              placeholder="Repeat password"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              Gym Address
            </label>
            <input
              id="address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street, area, landmark"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              City
            </label>
            <input
              id="city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Mumbai"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="state" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              State
            </label>
            <input
              id="state"
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="Maharashtra"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="gst" className="mb-1.5 block text-sm font-semibold text-[#33281E]">
              GST Number <span className="text-[#8C7A6B] font-normal">(optional)</span>
            </label>
            <input
              id="gst"
              value={form.gstNumber}
              onChange={(e) => set("gstNumber", e.target.value)}
              placeholder="27ABCDE1234F1Z5"
              className={inputCls}
            />
          </div>
        </div>

        <div
          className="flex cursor-pointer items-start gap-3 text-sm text-[#8C7A6B]"
          onClick={() => set("termsAccepted", !form.termsAccepted)}
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
              form.termsAccepted
                ? "border-[#8B5E34] bg-[#8B5E34] text-white"
                : "border-[#E5D9C5] bg-[#F9F8F6]"
            }`}
          >
            {form.termsAccepted && <Check className="h-3.5 w-3.5 text-white" />}
          </span>
          <span>
            I agree to XYRO&apos;s{" "}
            <span className="text-[#33281E] font-semibold underline decoration-[#8B5E34] underline-offset-2">Terms of Service</span>{" "}
            and{" "}
            <span className="text-[#33281E] font-semibold underline decoration-[#8B5E34] underline-offset-2">Privacy Policy</span>,
            and I confirm I&apos;m authorized to operate this gym.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[0_4px_18px_rgba(139,94,52,0.22)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creating your workspace…" : "Create My XYRO Workspace"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#8C7A6B]">
        Already have a workspace?{" "}
        <Link href="/login" className="font-semibold text-[#8B5E34] transition-colors hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}

