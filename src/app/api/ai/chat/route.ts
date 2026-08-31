import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAssistantResponse, type UserContext } from "@/lib/ai-assistant";
import { getClientIp, checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    // 1. Sliding-Window Rate Limit: 20 AI prompts per minute per IP
    const ip = await getClientIp();
    const rl = await checkRateLimit(`ai-chat:${ip}`, 20, 60);
    if (!rl.success) {
      return NextResponse.json(
        {
          reply: "You've sent several queries in a short time. Please wait a moment before asking another question.",
          actions: [{ label: "Browse Dashboard", url: "/dashboard" }],
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { message, path } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Input length capping to prevent prompt injection / payload bloat
    const sanitizedMessage = message.trim().slice(0, 1000);

    // Optional user session context (safely isolated)
    let context: UserContext = { path: typeof path === "string" ? path.slice(0, 200) : undefined };
    try {
      const session = await auth();
      if (session?.user) {
        context = {
          userName: session.user.name || undefined,
          userRole: session.user.role || undefined,
          gymCode: session.user.gymCode || undefined,
          path: typeof path === "string" ? path.slice(0, 200) : undefined,
        };
      }
    } catch {
      // Ignore session errors for public/visitor requests
    }

    const response = await generateAssistantResponse(sanitizedMessage, context);

    return NextResponse.json({
      reply: response.text,
      actions: response.actions || [],
    });
  } catch (error) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json(
      {
        reply:
          "I experienced a momentary glitch processing your request. Please ask your question again or explore your dashboard menu.",
        actions: [{ label: "Go to Dashboard", url: "/dashboard" }],
      },
      { status: 200 }
    );
  }
}
