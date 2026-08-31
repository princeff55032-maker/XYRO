import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getClientIp, checkRateLimit, resetRateLimit } from "@/lib/ratelimit";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: UserRole;
      gymId?: string | null;
      gymCode?: string | null;
      memberId?: string | null;
    };
  }
  interface User {
    role: UserRole;
    gymId?: string | null;
    gymCode?: string | null;
    memberId?: string | null;
  }
}

declare module "next-auth" {
  interface JWT {
    role: UserRole;
    gymId?: string | null;
    gymCode?: string | null;
    memberId?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email or Member ID", type: "text" },
        password: { label: "Password", type: "password" },
        portalRole: { label: "Portal Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Login identifier and password are required");
        }

        const inputIdentifier = (credentials.email as string).trim();
        const portalRole = (credentials.portalRole as string | undefined)?.toUpperCase();
        const ip = await getClientIp();
        const rateLimitKey = `login:${ip}:${inputIdentifier.toLowerCase()}`;

        // 1. Check IP+Identifier Sliding-Window Rate Limit (5 attempts / 15 minutes)
        const rl = await checkRateLimit(rateLimitKey, 5, 15 * 60);
        if (!rl.success) {
          const waitMins = Math.max(1, Math.ceil(rl.retryAfterSeconds / 60));
          throw new Error(`Too many login attempts. Locked out for ${waitMins} minutes.`);
        }

        // 2. Search user by email, memberId, or phone
        let user = null;

        if (inputIdentifier.includes("@")) {
          user = await prisma.user.findUnique({
            where: { email: inputIdentifier.toLowerCase() },
            include: {
              ownedGyms: { select: { id: true, gymCode: true }, take: 1 },
              gymStaff: { select: { gymId: true, gym: { select: { gymCode: true } } }, take: 1 },
              member: { select: { id: true, memberId: true, gymId: true, gym: { select: { gymCode: true } } } },
              trainer: { select: { id: true, gymId: true, gym: { select: { gymCode: true } } } },
            },
          });
        } else {
          // Check by memberId or phone
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { member: { memberId: { equals: inputIdentifier, mode: "insensitive" } } },
                { phone: inputIdentifier },
                { email: inputIdentifier.toLowerCase() },
              ],
            },
            include: {
              ownedGyms: { select: { id: true, gymCode: true }, take: 1 },
              gymStaff: { select: { gymId: true, gym: { select: { gymCode: true } } }, take: 1 },
              member: { select: { id: true, memberId: true, gymId: true, gym: { select: { gymCode: true } } } },
              trainer: { select: { id: true, gymId: true, gym: { select: { gymCode: true } } } },
            },
          });
        }

        if (!user || !user.password) {
          throw new Error("Invalid login credentials");
        }

        if (user.status === "SUSPENDED") {
          throw new Error("Your account has been suspended");
        }

        if (user.status === "DEACTIVATED") {
          throw new Error("Your account has been deactivated");
        }

        if (user.status === "PENDING_VERIFICATION") {
          throw new Error("Please verify your email address to activate your account.");
        }

        // Enforce Portal Role Boundary
        if (portalRole === "GYM") {
          if (user.role === "CUSTOMER") {
            throw new Error("This is a Gym Member account. Please select the 'Gym Member' tab above to log in.");
          }
          if (user.role === "TRAINER") {
            throw new Error("This is a Trainer account. Please select the 'Trainer' tab above to log in.");
          }
        } else if (portalRole === "TRAINER") {
          if (user.role !== "TRAINER" && user.role !== "SUPER_ADMIN") {
            throw new Error("This is not a Trainer account. Please select the appropriate portal tab above.");
          }
        } else if (portalRole === "MEMBER") {
          if (user.role !== "CUSTOMER" && user.role !== "SUPER_ADMIN") {
            throw new Error("This is a staff or admin account. Please select the 'Gym Admin' tab above to log in.");
          }
        }

        // 3. Check Database Temporary Lockout (Uniform security across all roles)
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMinutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000)));
          throw new Error(`Account temporarily locked due to failed attempts. Please try again in ${remainingMinutes} minutes.`);
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          const nextAttempts = (user.loginAttempts || 0) + 1;
          const isLocked = nextAttempts >= 5;

          // Increment login attempts & trigger 15-minute temporary lockout
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: nextAttempts,
              ...(isLocked ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}),
            },
          });

          if (isLocked) {
            throw new Error("5 failed attempts. Account temporarily locked for 15 minutes.");
          }

          const attemptsRemaining = Math.max(0, 5 - nextAttempts);
          throw new Error(`Invalid login credentials. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`);
        }


        // 4. Reset login attempts & rate limit bucket on successful login
        resetRateLimit(rateLimitKey);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        // Determine gymId & gymCode
        let gymId: string | null = null;
        let gymCode: string | null = null;
        let memberId: string | null = null;

        if (user.ownedGyms.length > 0) {
          gymId = user.ownedGyms[0].id;
          gymCode = user.ownedGyms[0].gymCode;
        } else if (user.gymStaff.length > 0) {
          gymId = user.gymStaff[0].gymId;
          gymCode = user.gymStaff[0].gym.gymCode;
        } else if (user.trainer) {
          gymId = user.trainer.gymId;
          gymCode = user.trainer.gym.gymCode;
        } else if (user.member) {
          gymId = user.member.gymId;
          gymCode = user.member.gym.gymCode;
          memberId = user.member.memberId;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          gymId,
          gymCode,
          memberId,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Ensure email is verified by Google
        if (profile && (profile as any).email_verified === false) {
          console.warn("[OAuth Security]: Blocked login with unverified Google email.");
          return false;
        }

        const cleanEmail = user.email.toLowerCase();
        let dbUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: {
            ownedGyms: { select: { id: true, gymCode: true }, take: 1 },
            gymStaff: { select: { gymId: true, gym: { select: { gymCode: true } } }, take: 1 },
          },
        });

        if (!dbUser) {
          // Auto-provision Gym Owner account
          dbUser = await prisma.user.create({
            data: {
              name: user.name || "Gym Administrator",
              email: cleanEmail,
              image: user.image,
              role: "GYM_OWNER",
              status: "ACTIVE",
              emailVerified: new Date(),
            },
            include: {
              ownedGyms: { select: { id: true, gymCode: true }, take: 1 },
              gymStaff: { select: { gymId: true, gym: { select: { gymCode: true } } }, take: 1 },
            },
          });
        }

        if (dbUser.status === "SUSPENDED" || dbUser.status === "DEACTIVATED" || dbUser.deletedAt) {
          return false;
        }

        user.id = dbUser.id;
        user.role = dbUser.role;
        user.gymId = dbUser.ownedGyms[0]?.id || dbUser.gymStaff[0]?.gymId || null;
        user.gymCode = dbUser.ownedGyms[0]?.gymCode || dbUser.gymStaff[0]?.gym?.gymCode || null;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.gymId = user.gymId;
        token.gymCode = user.gymCode;
        token.memberId = user.memberId;
      }

      // Re-hydrate and re-validate user account status from database
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              role: true,
              status: true,
              deletedAt: true,
              ownedGyms: { select: { id: true, gymCode: true }, take: 1 },
              gymStaff: { select: { gymId: true, gym: { select: { gymCode: true } } }, take: 1 },
              trainer: { select: { gymId: true, gym: { select: { gymCode: true } } } },
              member: { select: { memberId: true, gymId: true, gym: { select: { gymCode: true } } } },
            },
          });

          if (dbUser && !dbUser.deletedAt && dbUser.status !== "DEACTIVATED" && dbUser.status !== "SUSPENDED") {
            token.role = dbUser.role;
            token.gymId =
              dbUser.ownedGyms[0]?.id ||
              dbUser.gymStaff[0]?.gymId ||
              dbUser.trainer?.gymId ||
              dbUser.member?.gymId ||
              token.gymId ||
              null;
            token.gymCode =
              dbUser.ownedGyms[0]?.gymCode ||
              dbUser.gymStaff[0]?.gym?.gymCode ||
              dbUser.trainer?.gym?.gymCode ||
              dbUser.member?.gym?.gymCode ||
              token.gymCode ||
              null;
            token.memberId = dbUser.member?.memberId || token.memberId || null;
          }
        } catch (err) {
          console.warn("[NextAuth JWT]: Database re-hydration fallback:", err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as UserRole) || "CUSTOMER";
        session.user.gymId = (token.gymId as string | null) || undefined;
        session.user.gymCode = (token.gymCode as string | null) || undefined;
        session.user.memberId = (token.memberId as string | null) || undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "xyro-default-secure-auth-secret-string-production-key-998877",
});
