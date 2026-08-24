"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv, CsvColumn } from "@/lib/export-csv";

interface AttendanceExportData {
  id: string;
  memberName: string;
  memberId: string;
  checkInDate: string;
  checkInTime: string;
  method: string;
}

export function ExportAttendanceButton({ data }: { data: AttendanceExportData[] }) {
  const columns: CsvColumn<AttendanceExportData>[] = [
    { header: "Member Name", accessor: (a) => a.memberName },
    { header: "Member ID", accessor: (a) => a.memberId },
    { header: "Date", accessor: (a) => a.checkInDate },
    { header: "Check-in Time", accessor: (a) => a.checkInTime },
    { header: "Method", accessor: (a) => a.method },
  ];

  return (
    <Button
      type="button"
      onClick={() => exportToCsv("xyro_attendance_logs", columns, data)}
      className="inline-flex h-9.5 items-center gap-2 rounded-xl border border-[#E5D9C5] bg-white px-4 text-xs font-semibold text-[#33281E] shadow-xs transition-all duration-300 hover:bg-[#F3EFEA] hover:border-[#8B5E34] active:scale-[0.98] cursor-pointer"
    >
      <Download className="h-4 w-4 text-[#8B5E34]" />
      <span>Export Log CSV</span>
    </Button>
  );
}
