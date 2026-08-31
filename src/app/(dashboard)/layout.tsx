import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { Sidebar } from "./sidebar";
import { LiveRefresh } from "@/components/live-refresh";
import { DesktopTitleBar } from "@/components/desktop/title-bar";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTenant();

  const gym = session.user.gymId
    ? await prisma.gym.findUnique({
        where: { id: session.user.gymId },
        select: { name: true, gymCode: true },
      })
    : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F9F8F6] text-[#33281E] font-sans select-none">
      {/* Permanent Native Desktop Title Bar */}
      <DesktopTitleBar gymName={gym?.name} gymCode={gym?.gymCode} />

      {/* Main Body below Title Bar */}
      <div className="flex flex-1 pt-9 overflow-hidden">
        {/* Left-Aligned Navigation View Pane */}
        <Sidebar
          gymName={gym?.name}
          gymCode={gym?.gymCode}
          userName={session.user.name}
          userRole={session.user.role}
        />

        {/* Dense Native Workspace Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F9F8F6] p-4 md:p-6 pb-20 md:pb-8 select-text">
          <LiveRefresh intervalMs={10000} />
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation for Gym Owners */}
      <MobileBottomNav />
    </div>
  );
}
