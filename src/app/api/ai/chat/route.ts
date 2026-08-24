import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAssistantResponse, type UserContext } from "@/lib/ai-assistant";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, path } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Optional user session context (safely caught)
    let context: UserContext = { path: path || undefined };
    try {
      const session = await auth();
      if (session?.user) {
        context = {
          userName: session.user.name || undefined,
          userRole: session.user.role || undefined,
          gymCode: session.user.gymCode || undefined,
          path: path || undefined,
        };
      }
    } catch {
      // Ignore session errors for public/visitor requests
    }

    const response = await generateAssistantResponse(message, context);

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
