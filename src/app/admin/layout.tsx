import Link from "next/link";
import { LiveRefresh } from "@/components/live-refresh";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/marketing/logo";
import {
  Crown,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldAlert,
  ArrowRightLeft,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { AdminNav } from "./admin-nav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#33281E]">
      {/* Super Admin Top Control Bar */}
      <header className="sticky top-0 z-50 border-b border-[#E5D9C5] bg-white/95 backdrop-blur-2xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo />
            </Link>
            <div className="hidden h-5 w-px bg-[#E5D9C5] sm:block" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-[#E5D9C5] bg-[#F9F8F6] px-3.5 py-1 text-xs font-bold text-[#8B5E34] shadow-sm font-mono">
                <Crown className="h-3.5 w-3.5 text-[#8B5E34]" />
                <span>PLATFORM OWNER</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Switch to Gym Workspace View */}
            <Link
              href="/dashboard"
              className="hidden items-center gap-2 rounded-full border border-[#E5D9C5] bg-[#F9F8F6] px-4 py-2 text-xs font-semibold text-[#33281E] transition hover:border-[#8B5E34] hover:text-[#8B5E34] sm:flex"
              title="Open Gym Workspace"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-[#8B5E34]" />
              <span>Gym Workspace</span>
            </Link>

            <AdminNav
              userName={session.user.name ?? "Super Admin"}
              userEmail={session.user.email}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative min-h-[calc(100vh-65px)]">
        <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <LiveRefresh intervalMs={10000} />
          {children}
        </main>
      </div>
    </div>
  );
}
