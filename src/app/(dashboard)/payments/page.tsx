import { requireTenant } from "@/lib/tenant";
import prisma from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RecordPaymentDialog, ModifyPaymentDialog } from "./payments-form";
import { ExportPaymentsButton } from "./export-payments-button";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const session = await requireTenant();
  const gymId = session.user.gymId!;

  const [payments, members, plans, totals] = await Promise.all([
    prisma.payment.findMany({
      where: { gymId },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.member.findMany({
      where: { gymId, isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membershipPlan.findMany({
      where: { gymId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.payment.aggregate({
      where: { gymId, status: "PAID" },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const memberOptions = members.map((m) => ({
    id: m.id,
    label: `${m.user.name} (${m.memberId})`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5D9C5] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#33281E] tracking-tight">
            Payments &amp; Collections Ledger
          </h1>
          <p className="mt-1 text-xs text-[#8C7A6B]">
            Reconciled revenue:{" "}
            <span className="font-mono font-bold text-[#8B5E34]">
              {formatCurrency(totals._sum.totalAmount ?? 0)}
            </span>{" "}
            · {totals._count} recorded transaction{totals._count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPaymentsButton
            data={payments.map((p) => ({
              id: p.id,
              invoiceNumber: `INV-${p.id.slice(-6).toUpperCase()}`,
              memberName: p.member.user.name,
              amount: p.amount,
              tax: p.tax,
              totalAmount: p.totalAmount,
              method: p.method,
              status: p.status,
              paidAt: formatDate(p.paidAt || p.createdAt),
            }))}
          />
          <RecordPaymentDialog members={memberOptions} plans={plans} />
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#E5D9C5] bg-white py-20 text-center shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <p className="font-display text-base font-bold text-[#33281E]">
            No payment transactions recorded yet
          </p>
          <p className="max-w-sm text-xs text-[#8C7A6B]">
            Record your first fee payment via UPI, card, or cash to automatically activate membership validity.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white shadow-[0_4px_20px_rgba(51,40,30,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5D9C5] bg-[#F9F8F6]">
                  <th className="h-10 px-5 text-left text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                    Member
                  </th>
                  <th className="h-10 px-4 text-left text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                    Amount
                  </th>
                  <th className="h-10 px-4 text-left text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                    Payment Method
                  </th>
                  <th className="h-10 px-4 text-left text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                    Status
                  </th>
                  <th className="h-10 px-4 text-left text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                    Notes
                  </th>
                  <th className="h-10 px-4 text-left text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                    Recorded Date
                  </th>
                  <th className="h-10 px-4 text-right text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D9C5]">
                {payments.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-[#FAF9F7]">
                    <td className="px-5 py-3.5 font-semibold text-[#33281E]">
                      {p.member.user.name}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-800">
                      {formatCurrency(p.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {p.method.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          p.status === "PAID"
                            ? "success"
                            : p.status === "PENDING"
                            ? "warning"
                            : "destructive"
                        }
                        className="font-mono text-[10px]"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-[#8C7A6B]">{p.notes || "—"}</td>
                    <td className="px-4 py-3.5 font-mono text-[#8C7A6B]">
                      {formatDate(p.paidAt || p.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <ModifyPaymentDialog
                        payment={{
                          id: p.id,
                          memberName: p.member.user.name,
                          amount: p.totalAmount,
                          method: p.method,
                          status: p.status,
                          notes: p.notes,
                          paidAt: p.paidAt || p.createdAt,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
