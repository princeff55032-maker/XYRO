"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, Loader2, ArrowRight, ShieldCheck, MapPin, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLeadAction } from "@/app/(dashboard)/actions";

export function PublicTrialForm({
  gymId,
  gymName,
  gymAddress,
}: {
  gymId: string;
  gymName: string;
  gymAddress: string | null;
}) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    trialDate: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createLeadAction({
      gymId,
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      source: "WEBSITE_TRIAL",
      trialDate: formData.trialDate || undefined,
      notes: formData.notes || undefined,
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to book your trial pass. Please try again.");
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="glass rounded-3xl p-8 border border-emerald-500/30 text-center space-y-4 animate-fade-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="font-display text-2xl font-bold text-white">Your Free Trial is Booked!</h3>
        <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
          Welcome to <strong className="text-amber-300">{gymName}</strong>! Our reception desk has received your guest pass. Just visit the gym and show this confirmation.
        </p>

        <div className="mx-auto max-w-xs rounded-2xl border border-white/10 bg-white/5 p-4 text-xs space-y-1 text-left">
          <div className="text-gray-400">
            Name: <strong className="text-white">{formData.name}</strong>
          </div>
          <div className="text-gray-400">
            Phone: <strong className="text-white">{formData.phone}</strong>
          </div>
          {formData.trialDate && (
            <div className="text-gray-400">
              Reserved Date: <strong className="text-amber-300">{formData.trialDate}</strong>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 pt-2">
          📍 {gymAddress || "Ask front desk for workout equipment orientation."}
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 md:p-8 border border-amber-400/20 shadow-2xl">
      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-3">
        <Sparkles className="h-4 w-4" />
        <span>100% Free Guest Workout Pass</span>
      </div>

      <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
        Claim Your Free 1-Day Trial at {gymName}
      </h2>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        Experience state-of-the-art strength gear, cardio zones, and group workout sessions.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
            Your Full Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Amit Kumar"
            className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs text-white outline-none focus:border-amber-400/50"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
              Phone Number (WhatsApp)
            </label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs text-white outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="optional@gmail.com"
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs text-white outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
            Preferred Trial Date
          </label>
          <input
            type="date"
            value={formData.trialDate}
            onChange={(e) => setFormData({ ...formData, trialDate: e.target.value })}
            className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs text-white outline-none focus:border-amber-400/50"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
            Fitness Goal (Optional)
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Weight loss, muscle building, stamina"
            className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs text-white outline-none focus:border-amber-400/50"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="btn-primary mt-2 h-12 w-full text-xs font-bold text-white shadow-lg shadow-[#9B7B3C]/25 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reserving Your Pass...
            </>
          ) : (
            <>
              <span>Get Free 1-Day Pass</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
