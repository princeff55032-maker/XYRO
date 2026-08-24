/**
 * Universal CSV Export Utility for XYRO
 * Generates and downloads sanitized CSV files in the browser.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]) {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  const escapeCsvCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const dataRows = data.map((item) =>
    columns.map((col) => escapeCsvCell(col.accessor(item))).join(",")
  );

  const csvContent = [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
