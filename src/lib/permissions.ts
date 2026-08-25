import type { UserRole } from "@prisma/client";
import type { AuthenticatedWorkspaceContext } from "@/lib/tenant";

export type Permission =
  // Members
  | "members.view"
  | "members.create"
  | "members.edit"
  | "members.delete"
  // Payments
  | "payments.view"
  | "payments.create"
  | "payments.edit"
  | "payments.refund"
  // Invoices
  | "invoices.view"
  | "invoices.create"
  | "invoices.cancel"
  // Trainers & Workouts
  | "trainers.view"
  | "trainers.manage"
  | "workouts.manage"
  | "diets.manage"
  // Analytics & Dashboard
  | "analytics.view"
  // Settings & Workspace
  | "settings.manage"
  | "staff.manage"
  | "exports.manage"
  | "automation.manage"
  | "access_control.manage";

/**
 * Role-to-Permissions Mapping Matrix
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: [
    "members.view",
    "members.create",
    "members.edit",
    "members.delete",
    "payments.view",
    "payments.create",
    "payments.edit",
    "payments.refund",
    "invoices.view",
    "invoices.create",
    "invoices.cancel",
    "trainers.view",
    "trainers.manage",
    "workouts.manage",
    "diets.manage",
    "analytics.view",
    "settings.manage",
    "staff.manage",
    "exports.manage",
    "automation.manage",
    "access_control.manage",
  ],
  GYM_OWNER: [
    "members.view",
    "members.create",
    "members.edit",
    "members.delete",
    "payments.view",
    "payments.create",
    "payments.edit",
    "payments.refund",
    "invoices.view",
    "invoices.create",
    "invoices.cancel",
    "trainers.view",
    "trainers.manage",
    "workouts.manage",
    "diets.manage",
    "analytics.view",
    "settings.manage",
    "staff.manage",
    "exports.manage",
    "automation.manage",
    "access_control.manage",
  ],
  GYM_ADMIN: [
    "members.view",
    "members.create",
    "members.edit",
    "members.delete",
    "payments.view",
    "payments.create",
    "payments.edit",
    "payments.refund",
    "invoices.view",
    "invoices.create",
    "invoices.cancel",
    "trainers.view",
    "trainers.manage",
    "workouts.manage",
    "diets.manage",
    "analytics.view",
    "settings.manage",
    "staff.manage",
    "exports.manage",
    "automation.manage",
    "access_control.manage",
  ],
  RECEPTIONIST: [
    "members.view",
    "members.create",
    "members.edit",
    "payments.view",
    "payments.create",
    "invoices.view",
    "invoices.create",
    "trainers.view",
    "access_control.manage",
  ],
  TRAINER: [
    "members.view",
    "trainers.view",
    "workouts.manage",
    "diets.manage",
    "access_control.manage",
  ],
  CUSTOMER: [],
};

/**
 * Check if a role possesses a specific permission.
 */
export function hasPermission(role: UserRole | string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as UserRole];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Enforces permission check on an authenticated workspace context.
 * Throws a clean 403 Forbidden Error if unauthorized.
 */
export function requirePermission(
  ctx: AuthenticatedWorkspaceContext,
  permission: Permission
): void {
  if (!hasPermission(ctx.user.role, permission)) {
    throw new Error(`Forbidden: Insufficient privileges for action '${permission}'`);
  }
}
