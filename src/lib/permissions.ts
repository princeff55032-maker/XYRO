import type { UserRole } from "@prisma/client";
import type { AuthenticatedWorkspaceContext } from "@/lib/tenant";

export type Permission =
  // Members
  | "members.view"
  | "members.create"
  | "members.edit"
  | "members.delete"
  // Payments & Billing
  | "payments.view"
  | "payments.create"
  | "payments.edit"
  | "payments.refund"
  | "billing.manage"
  // Invoices
  | "invoices.view"
  | "invoices.create"
  | "invoices.cancel"
  // Trainers, Classes & Workouts
  | "trainers.view"
  | "trainers.manage"
  | "workouts.manage"
  | "diets.manage"
  | "classes.manage"
  // Analytics & Dashboard
  | "analytics.view"
  // Leads & CRM
  | "leads.manage"
  // Equipment & Expenses
  | "equipment.manage"
  | "expenses.manage"
  // Settings, Workspace & Security
  | "settings.manage"
  | "staff.manage"
  | "subscriptions.manage"
  | "exports.manage"
  | "automation.manage"
  | "access_control.manage"
  | "audit_logs.view";

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
    "billing.manage",
    "invoices.view",
    "invoices.create",
    "invoices.cancel",
    "trainers.view",
    "trainers.manage",
    "workouts.manage",
    "diets.manage",
    "classes.manage",
    "analytics.view",
    "leads.manage",
    "equipment.manage",
    "expenses.manage",
    "settings.manage",
    "staff.manage",
    "subscriptions.manage",
    "exports.manage",
    "automation.manage",
    "access_control.manage",
    "audit_logs.view",
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
    "billing.manage",
    "invoices.view",
    "invoices.create",
    "invoices.cancel",
    "trainers.view",
    "trainers.manage",
    "workouts.manage",
    "diets.manage",
    "classes.manage",
    "analytics.view",
    "leads.manage",
    "equipment.manage",
    "expenses.manage",
    "settings.manage",
    "staff.manage",
    "subscriptions.manage",
    "exports.manage",
    "automation.manage",
    "access_control.manage",
    "audit_logs.view",
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
    "billing.manage",
    "invoices.view",
    "invoices.create",
    "invoices.cancel",
    "trainers.view",
    "trainers.manage",
    "workouts.manage",
    "diets.manage",
    "classes.manage",
    "analytics.view",
    "leads.manage",
    "equipment.manage",
    "expenses.manage",
    "settings.manage",
    "staff.manage",
    "exports.manage",
    "automation.manage",
    "access_control.manage",
    "audit_logs.view",
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
    "leads.manage",
    "classes.manage",
    "access_control.manage",
  ],
  TRAINER: [
    "members.view",
    "trainers.view",
    "workouts.manage",
    "diets.manage",
    "classes.manage",
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
