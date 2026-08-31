import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount?: number | null, currency = "INR", symbol = "₹"): string {
  const num = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  if (currency === "INR") {
    return `${symbol}${num.toLocaleString("en-IN")}`;
  }
  return `${symbol}${num.toLocaleString()}`;
}

export function formatDate(date?: Date | string | null, format = "short"): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  if (format === "short") {
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (format === "long") {
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("en-IN");
}

export function generateMemberId(gymCode: string, sequence: number): string {
  return `${gymCode}-M-${String(sequence).padStart(6, "0")}`;
}

export function generateGymCode(sequence: number): string {
  return `GYM_${String(sequence).padStart(3, "0")}`;
}

export function generateInvoiceNumber(gymCode: string, sequence: number): string {
  const year = new Date().getFullYear();
  return `${gymCode}-INV-${year}-${String(sequence).padStart(5, "0")}`;
}

export function daysRemaining(endDate?: Date | string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate);
  if (isNaN(end.getTime())) return 0;
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "XY";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "XY";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
