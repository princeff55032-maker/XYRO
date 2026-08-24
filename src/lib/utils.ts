import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR", symbol = "₹"): string {
  if (currency === "INR") {
    return `${symbol}${amount.toLocaleString("en-IN")}`;
  }
  return `${symbol}${amount.toLocaleString()}`;
}

export function formatDate(date: Date | string, format = "short"): string {
  const d = new Date(date);
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

export function daysRemaining(endDate: Date | string): number {
  const end = new Date(endDate);
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

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
