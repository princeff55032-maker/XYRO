import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { Platform } from "@/components/marketing/platform";
import { Pricing } from "@/components/marketing/pricing";
import { CTA } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";
import { IntroOverlay } from "@/components/marketing/intro-overlay";

export const metadata: Metadata = {
  title: "XYRO — The Operating System for Modern Gyms & Fitness Centers",
  description:
    "Institutional-grade gym management platform. Unify biometric & QR turnstiles, automated WhatsApp renewal sequences, GST-compliant invoicing, and individualized strength programming in one high-performance console.",
};

export default function Home() {
  return (
    <main className="landing-page min-h-screen overflow-x-clip bg-[#F9F8F6] text-[#33281E]">
      <IntroOverlay />
      <Navbar />
      <Hero />
      <Features />
      <Platform />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
