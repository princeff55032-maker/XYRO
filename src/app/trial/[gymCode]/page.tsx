import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { PublicTrialForm } from "./trial-form";
import { Dumbbell, ShieldCheck, MapPin, Sparkles } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gymCode: string }>;
}) {
  const { gymCode } = await params;
  const gym = await prisma.gym.findUnique({
    where: { gymCode: gymCode.toUpperCase() },
    select: { name: true },
  });

  if (!gym) return { title: "Gym Free Trial — XYRO" };
  return {
    title: `Free 1-Day Workout Pass — ${gym.name}`,
    description: `Book your free trial session at ${gym.name}. Powered by XYRO.`,
  };
}

export default async function PublicTrialPage({
  params,
}: {
  params: Promise<{ gymCode: string }>;
}) {
  const { gymCode } = await params;

  const gym = await prisma.gym.findUnique({
    where: { gymCode: gymCode.toUpperCase() },
    select: {
      id: true,
      name: true,
      gymCode: true,
      address: true,
      city: true,
      phone: true,
      email: true,
    },
  });

  if (!gym) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9B7B3C] text-white font-display font-bold">
              X
            </div>
            <span className="font-display font-bold tracking-widest text-white text-sm">
              XYRO
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-white">{gym.name}</span>
            <p className="text-[10px] text-muted">Official Partner Facility</p>
          </div>
        </div>
      </header>

      {/* Main Hero & Form */}
      <main className="mx-auto w-full max-w-5xl px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="grid gap-12 lg:grid-cols-12 items-center">
          {/* Left Column Info */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Complimentary Gym Access Pass</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Start Your Fitness Journey at{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">
                {gym.name}
              </span>
            </h1>

            <p className="text-sm text-gray-300 leading-relaxed">
              Step into a premium workout space equipped with certified fitness trainers, modern strength machines, and motivating fitness classes.
            </p>

            <div className="space-y-3 pt-2 text-xs text-gray-300">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-amber-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Zero obligation, no credit card required to claim trial.</span>
              </div>

              {gym.address && (
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-amber-300">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span>
                    {gym.address}
                    {gym.city ? `, ${gym.city}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column Form */}
          <div className="lg:col-span-6">
            <PublicTrialForm
              gymId={gym.id}
              gymName={gym.name}
              gymAddress={gym.address}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-muted">
        Powered by <strong className="text-white">XYRO</strong> · The Intelligent Operating System for Modern Gyms
      </footer>
    </div>
  );
}
