"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Email delivery is not wired to a real provider in local dev.
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
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
        <h1 className="font-display text-3xl font-bold text-[#33281E]">Reset password</h1>
        <p className="mt-2 text-sm text-[#8C7A6B]">
          Enter your account email and we&apos;ll send you reset instructions.
        </p>
      </div>

      {submitted ? (
        <div className="mt-8 rounded-2xl border border-[#E5D9C5] bg-[#F9F8F6] px-4 py-5 text-center text-sm text-[#33281E]">
          <Mail className="mx-auto mb-2 h-6 w-6 text-[#8B5E34]" />
          If an account exists for <span className="font-semibold text-[#8B5E34]">{email}</span>,
          reset instructions are on their way.
          <p className="mt-2 text-xs text-[#8C7A6B]">
            (Email delivery is disabled in the local dev environment.)
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
            Send reset instructions
          </button>
        </form>
      )}
    </div>
  );
}
