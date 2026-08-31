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

  let gym: { name: string; gymCode: string } | null = null;
  if (session?.user?.gymId) {
    try {
      gym = await prisma.gym.findUnique({
        where: { id: session.user.gymId },
        select: { name: true, gymCode: true },
      });
    } catch (e) {
      console.warn("[DashboardLayout Gym Query Error]:", e);
    }
  }

  const gymName = gym?.name || "Workspace";
  const gymCode = gym?.gymCode || session.user.gymCode || "XYRO-001";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F9F8F6] text-[#33281E] font-sans select-none">
      {/* Permanent Native Desktop Title Bar */}
      <DesktopTitleBar gymName={gymName} gymCode={gymCode} />

      {/* Main Body below Title Bar */}
      <div className="flex flex-1 pt-9 overflow-hidden">
        {/* Left-Aligned Navigation View Pane */}
        <Sidebar
          gymName={gymName}
          gymCode={gymCode}
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
