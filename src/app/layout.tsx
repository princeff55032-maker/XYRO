import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { LegacyStorageCleanup } from "@/components/auth/legacy-storage-cleanup";
import { AiAssistant } from "@/components/ai-assistant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "XYRO — Your Gym. Your Members. One Powerful Platform.",
    template: "%s — XYRO",
  },
  description:
    "XYRO gives modern gyms everything they need to manage members, memberships, payments, attendance, trainers, workouts, and growth — all in one intelligent platform.",
  keywords: [
    "gym management software",
    "gym SaaS",
    "membership management",
    "fitness software",
    "gym billing",
    "attendance tracking",
    "XYRO",
  ],
  applicationName: "XYRO",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "XYRO — Your Gym. Your Members. One Powerful Platform.",
    description:
      "The intelligent operating system for modern gyms. Run your gym. Better.",
    siteName: "XYRO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XYRO — Run Your Gym. Better.",
    description:
      "The intelligent operating system for modern gyms. Manage members, payments, attendance, trainers, and growth in one platform.",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="noise min-h-full bg-background font-sans text-foreground">
        <LegacyStorageCleanup />
        {children}
        <AiAssistant />
      </body>
    </html>
  );
}



