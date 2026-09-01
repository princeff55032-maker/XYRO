"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  ChevronDown,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  ScanLine,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  actions?: { label: string; url: string }[];
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: "🚀 Register Gym", query: "How do I register and setup a new gym on XYRO?" },
  { label: "🏋️ Add New Member", query: "How do I register a new member and generate their ID?" },
  { label: "💳 Membership Packages", query: "How can I configure membership plans and pricing?" },
  { label: "📱 QR Attendance", query: "How does the digital QR attendance check-in work?" },
  { label: "🏃 Assign Trainers", query: "How do I add trainers and assign clients to them?" },
  { label: "🥗 Workouts & Diets", query: "How do I create custom workout and diet plans for members?" },
];


function formatMarkdown(text: string) {
  // Simple markdown-like parser for bold, lists, and links
  const lines = text.split("\n");

  return lines.map((line, idx) => {
    // Header 3
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="mt-3 mb-1.5 font-display text-sm font-bold text-[#8B5E34]">
          {line.replace("### ", "")}
        </h4>
      );
    }
    // Bullet point
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.substring(2);
      return (
        <li key={idx} className="ml-4 list-disc text-xs text-[#33281E] leading-relaxed my-0.5">
          {renderInlineFormatting(content)}
        </li>
      );
    }
    // Numbered list (e.g. 1. , 2. )
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^\d+\.\s/);
      const prefix = match ? match[0] : "";
      const content = line.substring(prefix.length);
      return (
        <div key={idx} className="flex items-start gap-1.5 text-xs text-[#33281E] leading-relaxed my-0.5">
          <span className="font-bold text-[#8B5E34] shrink-0">{prefix}</span>
          <span>{renderInlineFormatting(content)}</span>
        </div>
      );
    }
    // Standard paragraph or empty line
    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />;
    }
    return (
      <p key={idx} className="text-xs text-[#33281E] leading-relaxed my-1">
        {renderInlineFormatting(line)}
      </p>
    );
  });
}

function renderInlineFormatting(str: string) {
  // Replace bold **text** and links [text](url)
  const parts: React.ReactNode[] = [];
  let current = str;
  let keyIdx = 0;

  // Regex for markdown links [label](url) and bold **text** and code `code`
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\)|\`.*?\`)/g;
  const matches = current.split(regex);

  return matches.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-[#33281E]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-[#F3EFEA] border border-[#E5D9C5] px-1.5 py-0.5 font-mono text-[11px] text-[#8B5E34]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const labelMatch = part.match(/\[(.*?)\]/);
      const urlMatch = part.match(/\((.*?)\)/);
      if (labelMatch && urlMatch) {
        return (
          <Link
            key={i}
            href={urlMatch[1]}
            className="font-semibold text-[#8B5E34] underline underline-offset-2 hover:text-[#754E29] transition-colors"
          >
            {labelMatch[1]}
          </Link>
        );
      }
    }
    return part;
  });
}

export function AiAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: `### 🤖 Welcome to Help & Support

I'm your **XYRO Platform Assistant**. How can I help you today?

Ask me anything about:
- 🚀 **Registering & Setting Up Your Gym**
- 🏋️ **Gym Members & Athlete Onboarding**
- 💳 **Membership Packages & Billing**
- 📱 **QR Code Attendance & Digital Passes**
- 🥗 **Workout Routines & Nutrition Charts**

Feel free to choose a quick topic or type your question below.`,
      actions: [
        { label: "Gym Dashboard", url: "/dashboard" },
        { label: "Members Directory", url: "/members" },
        { label: "Pricing & Plans", url: "/plans" },
      ],
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (customQuery?: string) => {
    const query = customQuery || input.trim();
    if (!query || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      { id: userMessageId, sender: "user", text: query, timestamp: new Date() },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, path: pathname }),
      });

      if (!res.ok) throw new Error("Failed to fetch response");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: data.reply || "I couldn't process that response. Please try again.",
          actions: data.actions || [],
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "I'm having trouble connecting to the knowledge service. Please try again in a moment or visit [/dashboard](/dashboard).",
          actions: [{ label: "Go to Dashboard", url: "/dashboard" }],
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: `### 🤖 Conversation Reset

What topic would you like to explore? Choose a suggestion below or type your question.`,
        actions: [
          { label: "Gym Dashboard", url: "/dashboard" },
          { label: "Members Directory", url: "/members" },
          { label: "Membership Plans", url: "/plans" },
        ],
        timestamp: new Date(),
      },
    ]);
  };


  return (
    <>
      {/* ─── Floating Launcher Button ──────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 hidden md:flex items-center gap-2.5 rounded-full border border-[#8B5E34] bg-[#8B5E34] px-4 py-3 text-white font-semibold shadow-[0_8px_30px_rgba(139,94,52,0.3)] transition-all hover:scale-105 hover:bg-[#754E29] hover:shadow-[0_12px_36px_rgba(139,94,52,0.4)] cursor-pointer group"
          title="Open Help & Support"
        >
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <HelpCircle className="h-4.5 w-4.5 text-white transition-transform group-hover:rotate-12" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>
          <span className="text-xs font-bold tracking-wider uppercase">Help & Support</span>
        </button>
      )}

      {/* ─── Chat Window Modal ─────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 hidden md:flex h-[580px] w-[92vw] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-[#E5D9C5] bg-white shadow-[0_20px_60px_rgba(51,40,30,0.15),0_0_0_1px_#E5D9C5] animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E5D9C5] bg-[#F9F8F6] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5E34] text-white shadow-sm">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-sm font-bold text-[#33281E]">Help & Support</h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-[#8C7A6B]">XYRO Platform Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E] transition cursor-pointer"
                title="Reset Conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7A6B] hover:bg-[#F3EFEA] hover:text-[#33281E] transition cursor-pointer"
                title="Close Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#E5D9C5] bg-[#FAF9F7] px-4 py-2.5 scrollbar-none">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p.query)}
                disabled={loading}
                className="shrink-0 rounded-xl border border-[#E5D9C5] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#8B5E34] transition hover:bg-[#F3EFEA] cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin bg-white">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs shadow-xs ${
                    m.sender === "user"
                      ? "bg-[#8B5E34] text-white font-medium rounded-tr-xs"
                      : "bg-[#F9F8F6] border border-[#E5D9C5] text-[#33281E] rounded-tl-xs"
                  }`}
                >
                  {m.sender === "user" ? (
                    <p className="leading-relaxed">{m.text}</p>
                  ) : (
                    <div>{formatMarkdown(m.text)}</div>
                  )}

                  {/* Action Links */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#E5D9C5] pt-2.5">
                      {m.actions.map((a, i) => (
                        <Link
                          key={i}
                          href={a.url}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#E5D9C5] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#8B5E34] transition hover:bg-[#F3EFEA]"
                        >
                          <span>{a.label}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[9px] text-[#8C7A6B] px-1">
                  {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 rounded-2xl bg-[#F9F8F6] border border-[#E5D9C5] px-4 py-3 w-fit text-xs text-[#8B5E34]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-[11px] text-[#8C7A6B]">Finding answers for you…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="border-t border-[#E5D9C5] bg-[#F9F8F6] p-3.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about gyms, members, billing, QR, etc..."
                disabled={loading}
                className="h-10 flex-1 rounded-xl border border-[#E5D9C5] bg-white px-3.5 text-xs text-[#33281E] placeholder:text-[#8C7A6B]/60 outline-none transition focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5E34] text-white shadow-sm transition hover:bg-[#754E29] disabled:opacity-40 cursor-pointer shrink-0"
                title="Send Message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
