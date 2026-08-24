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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Login identifier and password are required");
        }

        const inputIdentifier = (credentials.email as string).trim();
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

        // 3. Check Database Temporary Lockout (Exempt Super Admin / Prince Gupta)
        const isOwner = user.role === "SUPER_ADMIN" || user.email.toLowerCase() === "prince@xyro.com";

        if (!isOwner && user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMinutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000)));
          throw new Error(`Account temporarily locked. Please try again in ${remainingMinutes} minutes.`);
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          if (!isOwner) {
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
          } else {
            throw new Error("Invalid login credentials.");
          }
        }


        // 4. Reset login attempts & rate limit bucket on successful login
        resetRateLimit(rateLimitKey);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            status: user.status === "PENDING_VERIFICATION" ? "ACTIVE" : user.status,
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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.gymId = user.gymId;
        token.gymCode = user.gymCode;
        token.memberId = user.memberId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.gymId = token.gymId as string | undefined;
        session.user.gymCode = token.gymCode as string | undefined;
        session.user.memberId = token.memberId as string | undefined;
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
  secret: process.env.AUTH_SECRET,
});
