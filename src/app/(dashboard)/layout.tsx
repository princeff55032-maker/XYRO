import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { Sidebar } from "./sidebar";
import { LiveRefresh } from "@/components/live-refresh";
import { DesktopTitleBar } from "@/components/desktop/title-bar";
import { DesktopStatusBar } from "@/components/desktop/status-bar";
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

  const gym = await prisma.gym.findUnique({
    where: { id: session.user.gymId! },
    select: { name: true, gymCode: true },
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F9F8F6] text-[#33281E] font-sans select-none">
      {/* Permanent Native Desktop Title Bar */}
      <DesktopTitleBar gymName={gym?.name} gymCode={gym?.gymCode} />

      {/* Main Body below Title Bar (h-9 = 36px) and above Status Bar (h-6 = 24px) */}
      <div className="flex flex-1 pt-9 pb-6 md:pb-6 overflow-hidden">
        {/* Left-Aligned Navigation View Pane */}
        <Sidebar
          gymName={gym?.name}
          gymCode={gym?.gymCode}
          userName={session.user.name}
          userRole={session.user.role}
        />

        {/* Dense Native Workspace Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F9F8F6] p-4 md:p-6 pb-20 md:pb-6 select-text">
          <LiveRefresh intervalMs={10000} />
          {children}
        </main>
      </div>

      {/* Permanent Native Desktop Status Bar */}
      <DesktopStatusBar gymCode={gym?.gymCode} />

      {/* Mobile Bottom Navigation for Gym Owners */}
      <MobileBottomNav />
    </div>
  );
}
