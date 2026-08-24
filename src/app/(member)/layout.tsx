import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { Logo } from "@/components/marketing/logo";
import { getInitials } from "@/lib/utils";
import { MemberNav } from "./member-nav";
import { LiveRefresh } from "@/components/live-refresh";

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/member");
  }

  const member = await prisma.member.findUnique({
    where: { userId: session.user.id },
    include: {
      gym: { select: { name: true, gymCode: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#33281E]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#E5D9C5] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/member">
              <Logo />
            </Link>
            <div className="hidden h-5 w-px bg-[#E5D9C5] sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs font-bold text-[#33281E]">
                {member?.gym.name ?? "Member Portal"}
              </span>
              <span className="rounded-md bg-[#F3EFEA] px-2 py-0.5 font-mono text-[10px] font-medium text-[#8C7A6B]">
                {member?.gym.gymCode}
              </span>
            </div>
          </div>

          <MemberNav
            userName={session.user.name ?? "Member"}
            userEmail={session.user.email}
            gymName={member?.gym.name}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative min-h-[calc(100vh-65px)]">
        <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <LiveRefresh intervalMs={10000} />
          {children}
        </main>
      </div>
    </div>
  );
}

