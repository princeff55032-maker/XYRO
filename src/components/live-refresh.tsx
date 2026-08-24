"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * LiveRefresh — Automatically re-fetches server component data at a fixed interval.
 * Drop this into any layout to make all child pages refresh in real-time.
 *
 * @param intervalMs — Polling interval in milliseconds (default: 15000 = 15s)
 */
export function LiveRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);

    // Also refresh when the tab regains focus (user switches back)
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, intervalMs]);

  return null;
}
