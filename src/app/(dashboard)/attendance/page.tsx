import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckInDialog } from "./attendance-form";
import { ExportAttendanceButton } from "./export-attendance-button";

export const metadata = { title: "Attendance" };


export default async function AttendancePage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  let today: any[] = [];
  let members: any[] = [];
  let thisWeek: any[] = [];

  try {
    const results = await Promise.all([
      prisma.attendance.findMany({
        where: { gymId, date: { gte: dayStart, lt: dayEnd } },
        include: {
          member: { include: { user: { select: { name: true } } } },
        },
        orderBy: { checkIn: "desc" },
      }),
      prisma.member.findMany({
        where: { gymId, isActive: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.attendance.groupBy({
        by: ["date"],
        where: {
          gymId,
          date: { gte: new Date(Date.now() - 6 * 86400000) },
        },
        _count: true,
        orderBy: { date: "desc" },
      }),
    ]);
    today = results[0];
    members = results[1];
    thisWeek = results[2];
  } catch (err) {
    console.error("[AttendancePage Fetch Error]:", err);
  }

  const memberOptions = members.map((m) => ({ id: m.id, label: `${m.user?.name || "Member"} (${m.memberId})` }));

  const totalThisWeek = thisWeek.reduce((a, r) => a + (r._count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5D9C5] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#33281E] tracking-tight">Access Control &amp; Turnstile Logs</h1>
          <p className="mt-1 text-xs text-[#8C7A6B]">
            <span className="font-mono font-bold text-[#8B5E34]">{today.length}</span> verified check-in
            {today.length === 1 ? "" : "s"} today · <span className="font-mono text-[#33281E] font-semibold">{totalThisWeek}</span> this week
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportAttendanceButton
            data={today.map((a) => ({
              id: a.id,
              memberName: a.member?.user?.name || "Member",
              memberId: a.member?.memberId || "—",
              checkInDate: formatDate(a.date),
              checkInTime: new Date(a.checkIn).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              method: a.method,
            }))}
          />
          <CheckInDialog members={memberOptions} />
        </div>
      </div>

      {today.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white py-20 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <p className="font-display text-base font-bold text-[#33281E]">No turnstile entries recorded yet today</p>
          <p className="max-w-sm text-xs text-[#8C7A6B]">
            Scan an athlete&apos;s dynamic QR pass or manually register their entry to log live floor capacity.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white shadow-[0_4px_20px_rgba(51,40,30,0.03)] lg:col-span-2">
            <div className="px-6 py-4 border-b border-[#E5D9C5] bg-[#F9F8F6]">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-[#8B5E34]">Today&apos;s Verified Entries</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E5D9C5] bg-[#F9F8F6]">
                    <th className="h-10 px-6 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Athlete</th>
                    <th className="h-10 px-4 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Timestamp</th>
                    <th className="h-10 px-4 text-left font-mono font-bold uppercase tracking-wider text-[#8C7A6B] text-[10px]">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D9C5]">
                  {today.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-[#FAF9F7]">
                      <td className="px-6 py-3.5 font-semibold text-[#33281E]">{a.member?.user?.name || "Member"}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[#8C7A6B]">
                        {a.checkIn.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={a.method === "QR_SCAN" ? "info" : "secondary"} className="font-mono text-[10px]">
                          {a.method.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E5D9C5] bg-white p-6 shadow-[0_4px_20px_rgba(51,40,30,0.03)] flex flex-col justify-between">
            <div>
              <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-[#8B5E34]">7-Day Turnstile Velocity</h2>
              <div className="flex h-44 items-end gap-2 pt-4">
                {[...Array(7)].map((_, i) => {
                  const d = new Date(dayStart.getTime() - (6 - i) * 86400000);
                  d.setHours(0, 0, 0, 0);
                  const row = thisWeek.find((r) => r.date.getTime() === d.getTime());
                  const count = row?._count ?? 0;
                  const max = Math.max(1, ...thisWeek.map((r) => r._count));
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-lg bg-[#8B5E34] transition-all shadow-xs"
                          style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 8 : 4 }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-semibold text-[#8C7A6B]">
                        {d.toLocaleDateString("en-IN", { weekday: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-4 text-xs font-mono text-[#8C7A6B] border-t border-[#E5D9C5] pt-3">{formatDate(dayStart)} — Today</p>
          </div>
        </div>
      )}
    </div>
  );
}
