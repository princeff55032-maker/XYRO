import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  // Skip Supabase network call if placeholder credentials are present
  if (supabaseUrl.includes("placeholder.supabase.co")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          })
        );
      },
    },
  });

  try {
    // Fetch verified user from Supabase Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const isVerifyEmailPage = pathname.startsWith("/verify-email");
    const isAuthCallback = pathname.startsWith("/auth/callback");
    const isPublicAuth =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/api/auth");

    // 1. Redirect unverified users away from protected areas to /verify-email
    if (user && !user.email_confirmed_at && !isVerifyEmailPage && !isAuthCallback && !isPublicAuth) {
      const verifyUrl = request.nextUrl.clone();
      verifyUrl.pathname = "/verify-email";
      return NextResponse.redirect(verifyUrl);
    }

    // 2. Redirect verified users away from /verify-email to /dashboard
    if (user && user.email_confirmed_at && isVerifyEmailPage) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  } catch (err) {
    // Gracefully continue without breaking edge/middleware
    console.warn("[Middleware updateSession]: Auth check warning:", err);
  }

  return supabaseResponse;
}
