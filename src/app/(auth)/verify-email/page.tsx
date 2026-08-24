"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, RefreshCw, LogOut, CheckCircle2, AlertCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleResend = async () => {
    setResending(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setMessage({
          type: "error",
          text: "No active session or email found. Please sign in again.",
        });
        setResending(false);
        return;
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: `A fresh confirmation link has been sent to ${user.email}. Please check your inbox and spam folder.`,
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Failed to resend confirmation email. Please try again.",
      });
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        setMessage({
          type: "success",
          text: "Email verified successfully! Redirecting to dashboard...",
        });
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1000);
      } else {
        setMessage({
          type: "error",
          text: "Your email has not been confirmed yet. Click the link sent to your inbox or click resend below.",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Unable to check status. Please reload the page.",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Verify your email
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          We sent a verification link to your email address. Please click the link to activate your account and enable full workspace permissions.
        </p>

        {message && (
          <div
            className={`mt-6 flex items-start gap-3 rounded-lg p-3 text-sm transition-all ${
              message.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "I've verified my email"}
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 font-medium text-secondary-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {resending ? "Sending..." : "Resend confirmation email"}
          </button>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
