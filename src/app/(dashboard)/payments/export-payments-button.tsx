"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv, CsvColumn } from "@/lib/export-csv";

interface PaymentExportData {
  id: string;
  invoiceNumber: string;
  memberName: string;
  amount: number;
  tax: number;
  totalAmount: number;
  method: string;
  status: string;
  paidAt: string;
}

export function ExportPaymentsButton({ data }: { data: PaymentExportData[] }) {
  const columns: CsvColumn<PaymentExportData>[] = [
    { header: "Invoice Number", accessor: (p) => p.invoiceNumber },
    { header: "Member Name", accessor: (p) => p.memberName },
    { header: "Base Amount (₹)", accessor: (p) => p.amount },
    { header: "GST Tax (₹)", accessor: (p) => p.tax },
    { header: "Total Paid (₹)", accessor: (p) => p.totalAmount },
    { header: "Payment Method", accessor: (p) => p.method },
    { header: "Payment Status", accessor: (p) => p.status },
    { header: "Payment Date", accessor: (p) => p.paidAt },
  ];

  return (
    <Button
      type="button"
      onClick={() => exportToCsv("xyro_financial_ledger", columns, data)}
      className="inline-flex h-9.5 items-center gap-2 rounded-xl border border-[#E5D9C5] bg-white px-4 text-xs font-semibold text-[#33281E] shadow-xs transition-all duration-300 hover:bg-[#F3EFEA] hover:border-[#8B5E34] active:scale-[0.98] cursor-pointer"
    >
      <Download className="h-4 w-4 text-[#8B5E34]" />
      <span>Export Ledger CSV</span>
    </Button>
  );
}
