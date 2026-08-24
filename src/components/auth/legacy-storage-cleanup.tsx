"use client";

import { useEffect } from "react";

/**
 * LegacyStorageCleanup ensures any legacy auth or session tokens
 * stored in window.localStorage are immediately wiped upon app load.
 */
export function LegacyStorageCleanup() {
  useEffect(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;

      const legacyKeys = [
        "token",
        "auth_token",
        "access_token",
        "session_token",
        "refresh_token",
        "supabase.auth.token",
        "sb-access-token",
        "sb-refresh-token",
      ];

      // Remove specific known keys
      legacyKeys.forEach((key) => {
        if (window.localStorage.getItem(key)) {
          window.localStorage.removeItem(key);
        }
      });

      // Remove any Supabase localStorage keys (e.g. sb-<ref>-auth-token)
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase.auth"))) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      // Storage access may fail in restricted environments (e.g. sandboxed iframes)
    }
  }, []);

  return null;
}
