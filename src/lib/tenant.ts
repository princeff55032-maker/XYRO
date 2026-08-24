import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { Session } from "next-auth";
import type { UserRole, User, Gym, GymSettings, GymSubscription } from "@prisma/client";

export type AuthenticatedWorkspaceContext = {
  session: Session;
  user: User;
  gym: Gym & {
    settings: GymSettings | null;
    subscription: GymSubscription | null;
  };
};

export type WorkspaceAuthOptions = {
  requireEmailVerified?: boolean;
};

/**
 * Resolve the authenticated session and the tenant (gym) it belongs to.
 * - No session → redirect to /login
 * - Customer → redirect to /member
 * - Session without a gym workspace → redirect to /register (onboarding)
 */
export async function requireTenant() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }
  if (session.user.role === "SUPER_ADMIN") {
    redirect("/admin");
  }
  if (session.user.role === "CUSTOMER") {
    redirect("/member");
  }
  if (session.user.role === "TRAINER") {
    redirect("/trainer");
  }
  if (!session.user.gymId) {
    redirect("/register");
  }
  return session;
}


/**
 * Fetch the gym for the session, verifying it still exists and is active.
 */
export async function getSessionGym() {
  const session = await auth();
  if (!session?.user?.id || !session.user.gymId) return null;

  const gym = await prisma.gym.findFirst({
    where: { id: session.user.gymId, deletedAt: null },
    include: {
      settings: true,
      subscription: true,
    },
  });
  if (!gym) return null;
  return { session: session as Session, gym };
}

/**
 * Ensures the caller has confirmed their email in Supabase Auth and database.
 */
export async function requireVerifiedEmail(userEmail?: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    // If Supabase user session exists, check confirmation timestamp
    if (supabaseUser) {
      if (!supabaseUser.email_confirmed_at) {
        throw new Error("EmailUnverified: Please verify your email before performing this action");
      }
      return true;
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("EmailUnverified")) {
      throw e;
    }
  }

  // Fallback to database email verification check if email provided
  if (userEmail) {
    const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (dbUser && dbUser.status === "PENDING_VERIFICATION") {
      throw new Error("EmailUnverified: Please verify your email before performing this action");
    }
  }

  return true;
}

/**
 * Enforces server-side authentication, active account status,
 * role authorization, and tenant isolation against the database.
 */
export async function requireWorkspaceAuth(
  allowedRoles?: UserRole[],
  options?: WorkspaceAuthOptions
): Promise<AuthenticatedWorkspaceContext> {
  const rawSession = await auth();
  if (!rawSession?.user?.id) {
    throw new Error("Unauthorized: Authentication required");
  }
  const session = rawSession as Session;

  // Re-verify user directly from the database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser || dbUser.deletedAt || dbUser.status !== "ACTIVE") {
    throw new Error("Unauthorized: User account is inactive or not found");
  }

  // Enforce required email verification if requested
  if (options?.requireEmailVerified) {
    await requireVerifiedEmail(dbUser.email);
  }

  // Super admins bypass tenant restrictions if needed
  if (dbUser.role === "SUPER_ADMIN") {
    if (session.user.gymId) {
      const gym = await prisma.gym.findFirst({
        where: { id: session.user.gymId, deletedAt: null },
        include: { settings: true, subscription: true },
      });
      if (gym) return { session, user: dbUser, gym };
    }
  }

  // Role authorization check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
    throw new Error(`Forbidden: Role '${dbUser.role}' lacks permission for this action`);
  }

  const gymId = session.user.gymId;
  if (!gymId) {
    throw new Error("Forbidden: No active workspace associated with this session");
  }

  // Re-verify gym tenant from database
  const gym = await prisma.gym.findFirst({
    where: { id: gymId, deletedAt: null },
    include: {
      settings: true,
      subscription: true,
    },
  });

  if (!gym) {
    throw new Error("Workspace not found or deactivated");
  }

  // Ensure user is authorized for this specific gym
  if (dbUser.role === "GYM_OWNER" && gym.ownerId !== dbUser.id) {
    throw new Error("Forbidden: You are not the owner of this workspace");
  }

  return { session, user: dbUser, gym };
}

/** All roles used by tenant-scoped dashboards. */
export const WORKSPACE_ROLES: readonly UserRole[] = [
  "SUPER_ADMIN",
  "GYM_OWNER",
  "GYM_ADMIN",
  "TRAINER",
  "RECEPTIONIST",
] as const;

export function isWorkspaceRole(role: string | undefined): boolean {
  return role ? (WORKSPACE_ROLES as readonly string[]).includes(role as UserRole) : false;
}
