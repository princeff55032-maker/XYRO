import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that don't require workspace tenant authorization
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/api/auth",
  "/auth/callback",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Update Supabase session cookies & handle email verification redirects
  const supabaseResponse = await updateSession(request);

  // If updateSession returned a redirect (e.g. to /verify-email), return it immediately
  if (supabaseResponse.status >= 300 && supabaseResponse.status < 400) {
    return supabaseResponse;
  }

  // Allow public routes
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) &&
    pathname !== "/dashboard" &&
    pathname !== "/trainer" &&
    pathname !== "/member" &&
    pathname !== "/customer" &&
    pathname !== "/admin"
  ) {
    return supabaseResponse;
  }

  // Allow API auth routes
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  // Check for session cookies (Supabase, Auth.js, NextAuth, chunked tokens)
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) =>
      c.name.includes("session-token") ||
      c.name.includes("auth-token") ||
      c.name.startsWith("authjs.") ||
      c.name.startsWith("__Secure-authjs.") ||
      c.name.startsWith("next-auth.") ||
      c.name.startsWith("__Secure-next-auth.") ||
      c.name.startsWith("sb-")
  );

  if (!hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const middleware = proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
