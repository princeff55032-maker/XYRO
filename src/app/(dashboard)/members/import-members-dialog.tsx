"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  ArrowRight,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { importGymDataAction, type ImportMemberRow, type ImportResult } from "../actions";

export function ImportMembersDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "result">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setRawHeaders([]);
    setRawRows([]);
    setMappings({});
    setResult(null);
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text
          .split(/\r\n|\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setError("File must have a header row and at least 1 member data row.");
          return;
        }

        // Parse CSV columns
        const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());
        const dataRows = lines.slice(1).map((l) =>
          l.split(",").map((cell) => cell.replace(/^["']|["']$/g, "").trim())
        );

        setRawHeaders(headers);
        setRawRows(dataRows);

        // Auto-detect common column headers
        const initialMap: Record<string, number> = {};
        headers.forEach((h, idx) => {
          const lower = h.toLowerCase();
          if (lower.includes("name") || lower.includes("member")) initialMap.name = idx;
          if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact")) initialMap.phone = idx;
          if (lower.includes("email") || lower.includes("mail")) initialMap.email = idx;
          if (lower.includes("plan") || lower.includes("membership") || lower.includes("tier")) initialMap.planName = idx;
          if (lower.includes("start") || lower.includes("joined") || lower.includes("admission")) initialMap.startDate = idx;
          if (lower.includes("expir") || lower.includes("end") || lower.includes("due")) initialMap.expiryDate = idx;
          if (lower.includes("amount") || lower.includes("price") || lower.includes("fee")) initialMap.amount = idx;
          if (lower.includes("status") || lower.includes("payment")) initialMap.paymentStatus = idx;
          if (lower.includes("gender")) initialMap.gender = idx;
          if (lower.includes("address") || lower.includes("city")) initialMap.address = idx;
        });

        setMappings(initialMap);
        setStep("mapping");
      } catch (err) {
        setError("Failed to parse CSV file. Please ensure it is a valid comma-separated text file.");
      }
    };
    reader.readAsText(file);
  };

  const getMappedRows = (): ImportMemberRow[] => {
    return rawRows.map((cols) => {
      const row: ImportMemberRow = {
        name: mappings.name !== undefined && cols[mappings.name] ? cols[mappings.name] : "",
        phone: mappings.phone !== undefined && cols[mappings.phone] ? cols[mappings.phone] : "",
        email: mappings.email !== undefined && cols[mappings.email] ? cols[mappings.email] : undefined,
        planName: mappings.planName !== undefined && cols[mappings.planName] ? cols[mappings.planName] : undefined,
        startDate: mappings.startDate !== undefined && cols[mappings.startDate] ? cols[mappings.startDate] : undefined,
        expiryDate: mappings.expiryDate !== undefined && cols[mappings.expiryDate] ? cols[mappings.expiryDate] : undefined,
        amount: mappings.amount !== undefined && cols[mappings.amount] ? cols[mappings.amount] : undefined,
        paymentStatus: mappings.paymentStatus !== undefined && cols[mappings.paymentStatus] ? cols[mappings.paymentStatus] : undefined,
        gender: mappings.gender !== undefined && cols[mappings.gender] ? cols[mappings.gender] : undefined,
        address: mappings.address !== undefined && cols[mappings.address] ? cols[mappings.address] : undefined,
      };
      return row;
    });
  };

  const handleStartImport = async () => {
    if (mappings.name === undefined || mappings.phone === undefined) {
      setError("Please map at least 'Member Name' and 'Phone Number' columns.");
      return;
    }

    setLoading(true);
    setError(null);

    const rowsToImport = getMappedRows();
    const res = await importGymDataAction(rowsToImport);

    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to process import");
      return;
    }

    setResult(res.data || null);
    setStep("result");
    router.refresh();
  };

  const downloadErrorReport = () => {
    if (!result || result.errors.length === 0) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Row,Member Name,Phone,Error Reason\n" +
      result.errors.map((e) => `"${e.row}","${e.name}","${e.phone}","${e.error}"`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `xyro_import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-9.5 rounded-xl border-[#E5D9C5] bg-white text-xs font-bold text-[#33281E] hover:border-[#8B5E34] hover:text-[#8B5E34]"
        >
          <FileSpreadsheet className="h-4 w-4 text-[#8B5E34]" />
          Import Existing Gym
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <FileSpreadsheet className="h-5 w-5 text-[#8B5E34]" />
            Import Existing Gym &amp; Member Records
          </DialogTitle>
          <DialogDescription className="text-left">
            Migrate from Excel, Google Sheets, or legacy software with automatic deduplication.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E5D9C5] bg-[#FAF9F7] p-8 text-center hover:border-[#8B5E34] hover:bg-[#F3EFEA] transition cursor-pointer"
            >
              <Upload className="h-10 w-10 text-[#8B5E34] mb-3 animate-bounce" />
              <h4 className="font-display text-sm font-bold text-[#33281E]">
                Click or Drag CSV file here
              </h4>
              <p className="text-xs text-[#8C7A6B] mt-1 max-w-sm">
                Upload your exported members list (.csv). Supports columns for Name, Phone, Email, Plan, Expiry, and Amount.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="rounded-xl border border-[#E5D9C5] bg-white p-4 text-xs space-y-1.5">
              <strong className="text-[#33281E]">Expected Format Tip:</strong>
              <p className="text-[#8C7A6B]">
                Your CSV can have column headers like: <code className="font-mono text-[#8B5E34]">Name, Phone, Email, Plan, Expiry Date, Amount</code>.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2">
              <span className="text-xs font-mono font-bold text-[#8C7A6B] uppercase">
                {rawRows.length} Rows Detected
              </span>
              <span className="text-xs text-[#8B5E34] font-medium">
                Map CSV headers to XYRO fields
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              {[
                { field: "name", label: "Member Name *", required: true },
                { field: "phone", label: "Phone Number *", required: true },
                { field: "email", label: "Email Address", required: false },
                { field: "planName", label: "Membership Plan", required: false },
                { field: "startDate", label: "Membership Start Date", required: false },
                { field: "expiryDate", label: "Membership Expiry Date", required: false },
                { field: "amount", label: "Fee / Amount Paid", required: false },
                { field: "paymentStatus", label: "Payment Status (PAID/PENDING)", required: false },
                { field: "gender", label: "Gender", required: false },
                { field: "address", label: "City / Address", required: false },
              ].map(({ field, label, required }) => (
                <div key={field} className="rounded-xl border border-[#E5D9C5] bg-[#F9F8F6] p-3">
                  <label className="block text-[11px] font-mono font-bold text-[#33281E] mb-1">
                    {label}
                  </label>
                  <select
                    value={mappings[field] !== undefined ? mappings[field] : ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : Number(e.target.value);
                      setMappings((prev) => ({ ...prev, [field]: val as number }));
                    }}
                    className="h-9 w-full rounded-lg border border-[#E5D9C5] bg-white px-2.5 text-xs text-[#33281E] outline-none focus:border-[#8B5E34]"
                  >
                    <option value="">-- Do not map --</option>
                    {rawHeaders.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {header} (Column {idx + 1})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E5D9C5]">
              <Button
                variant="outline"
                onClick={resetState}
                className="text-xs"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={mappings.name === undefined || mappings.phone === undefined}
                className="btn-primary h-9.5 px-5 text-xs font-bold text-white"
              >
                <span>Preview Import</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between border-b border-[#E5D9C5] pb-2">
              <span className="text-xs font-mono font-bold text-[#33281E]">
                Preview First 5 Records
              </span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {rawRows.length} Total Members
              </Badge>
            </div>

            <div className="max-h-60 overflow-x-auto rounded-xl border border-[#E5D9C5] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E5D9C5] bg-[#FAF9F7] text-[10px] font-mono uppercase text-[#8C7A6B]">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Plan</th>
                    <th className="p-2">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D9C5]">
                  {getMappedRows()
                    .slice(0, 5)
                    .map((r, i) => (
                      <tr key={i} className="hover:bg-[#FAF9F7]">
                        <td className="p-2 font-bold text-[#33281E]">{r.name || "—"}</td>
                        <td className="p-2 font-mono text-[#8B5E34]">{r.phone || "—"}</td>
                        <td className="p-2 text-[#8C7A6B]">{r.email || "—"}</td>
                        <td className="p-2 text-[#33281E]">{r.planName || "—"}</td>
                        <td className="p-2 font-mono text-[#8C7A6B]">{r.expiryDate || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E5D9C5]">
              <Button
                variant="outline"
                onClick={() => setStep("mapping")}
                className="text-xs"
              >
                Back to Mapping
              </Button>
              <Button
                onClick={handleStartImport}
                disabled={loading}
                className="btn-primary h-9.5 px-6 text-xs font-bold text-white"
              >
                {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {loading ? "Importing records…" : `Confirm & Import ${rawRows.length} Members`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Results & Report */}
        {step === "result" && result && (
          <div className="space-y-5 py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-[#33281E]">
                Migration Complete
              </h3>
              <p className="text-xs text-[#8C7A6B] mt-0.5">
                Processed {result.total} member records into your active workspace.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-800">
                  Imported
                </span>
                <p className="font-display text-xl font-bold text-emerald-900 mt-0.5">
                  {result.imported}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <span className="font-mono text-[10px] uppercase font-bold text-amber-800">
                  Skipped (Duplicate)
                </span>
                <p className="font-display text-xl font-bold text-amber-900 mt-0.5">
                  {result.skipped}
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/60 p-3">
                <span className="font-mono text-[10px] uppercase font-bold text-red-800">
                  Errors
                </span>
                <p className="font-display text-xl font-bold text-red-900 mt-0.5">
                  {result.errors.length}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-[#E5D9C5]">
              {result.errors.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadErrorReport}
                  className="text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download Error Report ({result.errors.length})
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-primary px-6 text-xs text-white font-bold"
              >
                Close &amp; View Members
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
