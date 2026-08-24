/**
 * XYRO AI Assistant ("Atlas") Knowledge & Reasoning Engine (Public Facing)
 *
 * Connected to Google Gemini with domain knowledge for gym owners,
 * members, trainers, and visitors. Confidential Super Admin / Platform Owner
 * controls are strictly kept private and omitted.
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface UserContext {
  userName?: string;
  userRole?: string;
  gymName?: string;
  gymCode?: string;
  path?: string;
}

interface KnowledgeTopic {
  id: string;
  keywords: string[];
  title: string;
  summary: string;
  actions?: { label: string; url: string }[];
  content: string;
}

const KNOWLEDGE_BASE: KnowledgeTopic[] = [
  {
    id: "gym-registration",
    keywords: ["register gym", "create gym", "new gym", "start gym", "onboarding", "setup gym", "gym workspace"],
    title: "Register & Setup Your Gym Workspace",
    summary: "How to register your gym, configure details, and launch your digital gym operations.",
    actions: [{ label: "Register Your Gym", url: "/register" }],
    content: `### 🚀 Register & Launch Your Gym on XYRO

Getting started with XYRO is quick and frictionless:

1. **Register Your Workspace**: Visit the [Gym Registration](/register) page and enter your gym name, location, owner contact, and secure password.
2. **Instant Workspace Creation**: Your gym receives a dedicated workspace code (e.g. \`GYM_001\`) and access to your management portal.
3. **Configure Plans**: Set up custom membership tiers (Monthly, Quarterly, Annual) under [Membership Plans](/plans).
4. **Onboard Members & Coaches**: Add existing athletes and staff in minutes from the [Members Directory](/members).

👉 **Direct Link**: Register your gym today at [/register](/register).`,
  },
  {
    id: "member-management",
    keywords: ["add member", "member", "members", "register customer", "new athlete", "member id", "active members"],
    title: "Member Onboarding & Management",
    summary: "How to register members, assign membership plans, track status, and view member profiles.",
    actions: [{ label: "Go to Members Directory", url: "/members" }],
    content: `### 🏋️ Member Management in XYRO

You can manage your gym's athlete roster directly from the **Members Directory**:

1. **Add a Member**: Click **"+ Add Member"** in the top right of the Members page. Enter their full name, email, phone number, and assign their membership plan and emergency contact.
2. **Member ID Generation**: XYRO automatically issues a unique Member ID (e.g. \`GYM_TITAN-M-001\`) for barcode and QR check-ins.
3. **Assign Trainers**: Link members to dedicated coaches for personalized workout and diet routine tracking.
4. **Member Portal Access**: Members can log in at [/login](/login) using their email or Member ID to view their digital QR pass and diet charts.

👉 **Direct Link**: View and manage athletes at [/members](/members).`,
  },
  {
    id: "membership-plans",
    keywords: ["membership plan", "plans", "pricing", "subscription", "starter", "pro", "business", "freeze", "duration"],
    title: "Membership Plans & Packages",
    summary: "Creating and configuring gym membership packages (Monthly, Quarterly, Annual, PT).",
    actions: [{ label: "Manage Membership Plans", url: "/plans" }],
    content: `### 💳 Membership Plans & Packages

XYRO allows you to create flexible membership packages tailored to your gym:

- **Custom Durations**: Create 1-month, 3-month, 6-month, or Annual plans.
- **Add-on Perks**: Enable personal training access, group class bookings, and locker access on premium tiers.
- **Freeze Days**: Allow members to temporarily pause memberships during travel or recovery without losing days.
- **Auto-Renewal & Expiry Alerts**: The system tracks upcoming renewals and alerts owners before members lapse.

👉 **Direct Link**: Configure your packages at [/plans](/plans).`,
  },
  {
    id: "payments-billing",
    keywords: ["payment", "payments", "billing", "invoice", "revenue", "cash", "upi", "card", "refund", "receipt"],
    title: "Payments, Invoicing & Financial Records",
    summary: "Recording member payments, issuing digital receipts, and tracking cash/UPI revenue.",
    actions: [{ label: "View Payments & Invoices", url: "/payments" }],
    content: `### 💰 Payments & Invoicing

Keep financial records organized with XYRO's unified billing system:

- **Record Transactions**: Accept member payments via **Cash, UPI, Credit/Debit Card, or Bank Transfer**.
- **Instant Digital Invoices**: Generate itemized PDF invoices with your gym's branding and GST details.
- **Partial & Pending Payments**: Track outstanding dues and payment installments with automated balance calculation.
- **Financial Analytics**: View today's, this week's, and monthly collection figures on your dashboard overview.

👉 **Direct Link**: Review payment history at [/payments](/payments).`,
  },
  {
    id: "attendance-qr",
    keywords: ["attendance", "qr", "qr code", "check in", "check-in", "scan", "scanner", "present", "streak"],
    title: "QR Code Attendance & Check-in System",
    summary: "Fast, contactless member check-ins using dynamic QR codes and manual reception logs.",
    actions: [{ label: "Open Attendance Dashboard", url: "/attendance" }],
    content: `### 📱 QR Code Attendance System

XYRO provides a lightning-fast check-in workflow:

1. **Digital Member QR Pass**: Every member has a personal QR code available inside their [Member Portal](/member).
2. **Desk Scanner**: The front desk or reception can scan member QR codes using any camera or phone.
3. **Manual Check-in**: Receptionists can search by name or Member ID to log attendance with a single click.
4. **Attendance Analytics**: Track peak hour traffic, member visit streaks, and identify inactive members who need re-engagement.

👉 **Direct Link**: Track daily attendance at [/attendance](/attendance).`,
  },
  {
    id: "trainers-coaches",
    keywords: ["trainer", "trainers", "coach", "coaches", "staff", "trainer portal", "assign trainer"],
    title: "Trainer Management & Coach Portal",
    summary: "Managing personal trainers, assigning clients, and trainer portal workflows.",
    actions: [
      { label: "Manage Trainers", url: "/trainers" },
      { label: "Open Trainer Portal", url: "/trainer" },
    ],
    content: `### 🏃 Trainers & Coaching Staff

Empower your coaches to deliver elite athlete management:

- **Add Trainers**: Create staff profiles with specializations (Strength, Hypertrophy, CrossFit, Yoga) and contact details.
- **Dedicated Trainer Portal**: Coaches log in at [/trainer](/trainer) to see their assigned clients, schedule sessions, and monitor progress.
- **Client Rosters**: Assign athletes to specific trainers for 1-on-1 guidance.

👉 **Direct Links**: Manage coaches at [/trainers](/trainers) or view the [Trainer Portal](/trainer).`,
  },
  {
    id: "workouts-diets",
    keywords: ["workout", "workouts", "exercise", "diet", "meal", "nutrition", "macro", "calories", "protein", "routine"],
    title: "Workout Routines & Nutrition Plans",
    summary: "Building structured workout splits, exercise logs, and personalized diet charts.",
    actions: [{ label: "Workouts & Diets", url: "/workouts" }],
    content: `### 🥗 Workouts & Nutrition Planning

Create tailored fitness plans for your gym members:

- **Workout Builder**: Design custom splits (Push/Pull/Legs, Upper/Lower, Full Body) with targeted sets, reps, and rest intervals.
- **Diet & Nutrition**: Build daily meal charts with macro breakdowns (Protein, Carbs, Fats) and calorie targets.
- **Member Sync**: Assigned plans appear automatically in the athlete's [Member Portal](/member).

👉 **Direct Link**: Build routines at [/workouts](/workouts).`,
  },
  {
    id: "troubleshooting-login",
    keywords: ["login", "cant login", "forgot password", "password reset", "rate limit", "locked", "account"],
    title: "Login & Account Troubleshooting",
    summary: "Help with logging into the correct portal, password resets, and account access.",
    actions: [
      { label: "Go to Login", url: "/login" },
      { label: "Register New Gym", url: "/register" },
    ],
    content: `### 🔑 Login & Account Help

Need help accessing your XYRO account?

- **Role Portals**:
  - **Gym Owners**: Select "Gym Admin" on [/login](/login) or use your registered admin email.
  - **Trainers**: Select "Trainer" and enter your coach email or phone number.
  - **Gym Members**: Select "Gym Member" and enter your Member ID or registered email.
- **Password Reset**: Click "Forgot password?" on the login screen to request a secure reset link.`,
  },
];

async function callGeminiApi(
  userQuery: string,
  context?: UserContext,
  apiKey?: string
): Promise<string | null> {
  if (!apiKey) return null;

  const systemPrompt = `You are the public-facing "XYRO Help & Support Assistant" and customer success guide for "XYRO" (The intelligent operating system for modern gyms).
You help gym owners, athletes, personal trainers, and prospective gym clients with everything related to using XYRO, gym operations, membership management, workout routines, nutrition, and features.

CONFIDENTIALITY RULES (VERY IMPORTANT):
- You are strictly for public users and gym staff.
- You must NEVER mention, reveal, discuss, or reference Super Admin, Master Platform Owner controls, internal SaaS MRR numbers, gym suspensions, or the /admin path. Those are confidential internal platform controls.
- If someone asks about platform administration, redirect them to the general Gym Owner Workspace (/dashboard).

Platform details for public & gym users:
- Register a Gym: /register
- Gym Dashboard / Workspace: /dashboard (Members, Plans, Payments, Attendance, Trainers, Workouts, Settings)
- Members Directory: /members
- Membership Packages: /plans
- Payments & Invoicing: /payments
- QR Code Attendance: /attendance
- Trainer Portal: /trainer
- Member Portal: /member
- Login: /login

Formatting rules:
- Format your response using clean, structured Markdown (use ### for subheadings, bullet points, bold key terms, and markdown links like [Gym Dashboard](/dashboard)).
- Keep answers professional, concise, encouraging, and highly actionable.
- Always include relevant XYRO internal links so the user can navigate immediately.

User context:
- User Name: ${context?.userName || "Guest / Visitor"}
- User Role: ${context?.userRole || "Visitor / Gym Admin"}
- Gym Workspace: ${context?.gymName ? `${context.gymName} (${context.gymCode})` : "General"}
- Current URL path: ${context?.path || "/"}`;

  const models = [
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it",
  ];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nUser Question: ${userQuery}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) return candidate;
      }
    } catch (err) {
      console.warn(`Gemini model ${model} attempt failed:`, err);
    }
  }

  return null;
}

export async function generateAssistantResponse(
  userQuery: string,
  context?: UserContext
): Promise<{ text: string; actions?: { label: string; url: string }[] }> {
  const queryLower = userQuery.toLowerCase().trim();
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Check for greeting / identity questions
  if (
    queryLower.match(/^(hi|hello|hey|greetings|who are you|what can you do|help)$/i) ||
    queryLower.length <= 3
  ) {
    const greeting = context?.userName ? `Hello, **${context.userName}**!` : "Hello and welcome to **XYRO**!";
    return {
      text: `${greeting} Welcome to **Help & Support**. I am your XYRO assistant.

I can help you with anything across the gym platform:
- 🚀 **Registering & Setting Up Your Gym**
- 🏋️ **Gym Members & Athlete Onboarding**
- 💳 **Membership Packages & Billing**
- 📱 **QR Code Attendance & Passes**
- 🏃 **Trainer Management & Coach Portals**
- 🥗 **Workout Routines & Nutrition Charts**
- 🔑 **Account Navigation & Troubleshooting**

What would you like assistance with today?`,
      actions: [
        { label: "Gym Dashboard", url: "/dashboard" },
        { label: "Members Directory", url: "/members" },
        { label: "Register Gym", url: "/register" },
      ],
    };
  }

  // 2. Attempt live Google Gemini inference if API key is active
  if (apiKey) {
    const geminiReply = await callGeminiApi(userQuery, context, apiKey);
    if (geminiReply) {
      const actions: { label: string; url: string }[] = [];
      if (queryLower.includes("register") || queryLower.includes("start") || queryLower.includes("new gym")) {
        actions.push({ label: "Register Gym", url: "/register" });
      }
      if (queryLower.includes("member") || queryLower.includes("athlete")) {
        actions.push({ label: "Members", url: "/members" });
      }
      if (queryLower.includes("plan") || queryLower.includes("price") || queryLower.includes("package")) {
        actions.push({ label: "Plans", url: "/plans" });
      }
      if (queryLower.includes("pay") || queryLower.includes("invoice") || queryLower.includes("bill")) {
        actions.push({ label: "Payments", url: "/payments" });
      }
      if (queryLower.includes("qr") || queryLower.includes("attendance")) {
        actions.push({ label: "Attendance", url: "/attendance" });
      }
      if (queryLower.includes("trainer") || queryLower.includes("coach")) {
        actions.push({ label: "Trainers", url: "/trainers" });
      }
      if (actions.length === 0) {
        actions.push({ label: "Dashboard", url: "/dashboard" });
      }

      return {
        text: geminiReply,
        actions,
      };
    }
  }

  // 3. Fallback to high-confidence Knowledge Base match
  let bestMatch: KnowledgeTopic | null = null;
  let highestScore = 0;

  for (const topic of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (queryLower.includes(kw)) {
        score += kw.split(" ").length * 2;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = topic;
    }
  }

  if (bestMatch && highestScore >= 2) {
    return {
      text: bestMatch.content,
      actions: bestMatch.actions,
    };
  }

  // 4. Default smart fallback
  return {
    text: `### 🤖 XYRO Assistant Guidance

You asked: *"**${userQuery}**"*

Here are the most common public workflows in XYRO that may help:

1. **Gym Administration**: Manage your members, trainers, plans, and revenue in the [Gym Dashboard](/dashboard).
2. **Register a Gym**: Start your gym management workspace in minutes at [Register Your Gym](/register).
3. **Athletes & Coaches**: Access the [Trainer Portal](/trainer) or the [Member Portal](/member) for client routines and QR passes.
4. **Setup & Billing**: Configure custom membership plans at [/plans](/plans) or record member transactions at [/payments](/payments).

If you have a specific question, feel free to ask!`,
    actions: [
      { label: "Dashboard", url: "/dashboard" },
      { label: "Members", url: "/members" },
      { label: "Plans", url: "/plans" },
      { label: "Register Gym", url: "/register" },
    ],
  };
}
