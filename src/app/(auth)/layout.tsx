import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#F9F8F6] text-[#33281E]">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-14">
        <Link href="/" className="mb-10 transition-transform duration-300 hover:scale-105">
          <Logo />
        </Link>
        {children}
      </div>

      <p className="relative z-10 pb-8 text-center font-mono text-xs text-[#8C7A6B]">
        XYRO · The intelligent operating system for modern gyms
      </p>
    </main>
  );
}
