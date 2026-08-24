"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv, CsvColumn } from "@/lib/export-csv";
import { formatDate } from "@/lib/utils";

interface MemberExportData {
  id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string | null;
  planName: string;
  expiryDate: string;
  trainerName: string;
  status: string;
  joinDate: string;
}


export function ExportMembersButton({ data }: { data: MemberExportData[] }) {
  const columns: CsvColumn<MemberExportData>[] = [
    { header: "Member ID", accessor: (m) => m.memberId },
    { header: "Full Name", accessor: (m) => m.name },
    { header: "Email", accessor: (m) => m.email },
    { header: "Phone", accessor: (m) => m.phone },
    { header: "Membership Plan", accessor: (m) => m.planName },
    { header: "Plan Expiry", accessor: (m) => m.expiryDate },
    { header: "Assigned Trainer", accessor: (m) => m.trainerName },
    { header: "Account Status", accessor: (m) => m.status },
    { header: "Join Date", accessor: (m) => m.joinDate },
  ];

  return (
    <Button
      type="button"
      onClick={() => exportToCsv("xyro_members", columns, data)}
      className="inline-flex h-9.5 items-center gap-2 rounded-xl border border-[#E5D9C5] bg-white px-4 text-xs font-semibold text-[#33281E] shadow-xs transition-all duration-300 hover:bg-[#F3EFEA] hover:border-[#8B5E34] active:scale-[0.98] cursor-pointer"
    >
      <Download className="h-4 w-4 text-[#8B5E34]" />
      <span>Export CSV</span>
    </Button>
  );
}
