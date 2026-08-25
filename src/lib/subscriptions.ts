import prisma from "@/lib/db";
import type { SubscriptionPlan, GymSubscription } from "@prisma/client";

export type FeatureKey =
  | "dynamic_qr"
  | "cash_ledger"
  | "gst_invoicing"
  | "whatsapp_automations"
  | "trainer_management"
  | "workouts_and_diets"
  | "group_classes"
  | "staff_rbac"
  | "data_export"
  | "hardware_relay_api"
  | "multi_branch";

export interface PlanConfig {
  plan: SubscriptionPlan;
  name: string;
  badge: string;
  price: number;
  maxMembers: number;
  maxTrainers: number;
  minPlanForFeature: string;
  features: Record<FeatureKey, boolean>;
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  FREE: {
    plan: "FREE",
    name: "Studio Sandbox (Free)",
    badge: "FREE",
    price: 0,
    maxMembers: 50,
    maxTrainers: 1,
    minPlanForFeature: "Free",
    features: {
      dynamic_qr: true,
      cash_ledger: true,
      gst_invoicing: false,
      whatsapp_automations: false,
      trainer_management: true,
      workouts_and_diets: false,
      group_classes: false,
      staff_rbac: false,
      data_export: false,
      hardware_relay_api: false,
      multi_branch: false,
    },
  },
  STARTER: {
    plan: "STARTER",
    name: "Single Facility (Starter)",
    badge: "STARTER",
    price: 1499,
    maxMembers: 300,
    maxTrainers: 3,
    minPlanForFeature: "Starter",
    features: {
      dynamic_qr: true,
      cash_ledger: true,
      gst_invoicing: true,
      whatsapp_automations: true,
      trainer_management: true,
      workouts_and_diets: false,
      group_classes: false,
      staff_rbac: false,
      data_export: true,
      hardware_relay_api: false,
      multi_branch: false,
    },
  },
  PRO: {
    plan: "PRO",
    name: "Performance Gym (Pro)",
    badge: "PRO",
    price: 3499,
    maxMembers: 999999,
    maxTrainers: 999999,
    minPlanForFeature: "Pro",
    features: {
      dynamic_qr: true,
      cash_ledger: true,
      gst_invoicing: true,
      whatsapp_automations: true,
      trainer_management: true,
      workouts_and_diets: true,
      group_classes: true,
      staff_rbac: true,
      data_export: true,
      hardware_relay_api: false,
      multi_branch: false,
    },
  },
  BUSINESS: {
    plan: "BUSINESS",
    name: "Enterprise Chain (Business)",
    badge: "BUSINESS",
    price: 7999,
    maxMembers: 999999,
    maxTrainers: 999999,
    minPlanForFeature: "Business",
    features: {
      dynamic_qr: true,
      cash_ledger: true,
      gst_invoicing: true,
      whatsapp_automations: true,
      trainer_management: true,
      workouts_and_diets: true,
      group_classes: true,
      staff_rbac: true,
      data_export: true,
      hardware_relay_api: true,
      multi_branch: true,
    },
  },
};

/**
 * Retrieves the effective subscription for a gym workspace.
 */
export async function getGymSubscription(gymId: string): Promise<{
  subscription: GymSubscription | null;
  plan: SubscriptionPlan;
  config: PlanConfig;
  isTrial: boolean;
}> {
  const sub = await prisma.gymSubscription.findUnique({
    where: { gymId },
  });

  const plan: SubscriptionPlan = sub?.status === "ACTIVE" ? sub.plan : "FREE";
  const config = PLAN_CONFIGS[plan] || PLAN_CONFIGS.FREE;

  return {
    subscription: sub,
    plan,
    config,
    isTrial: !sub || sub.status !== "ACTIVE",
  };
}

/**
 * Asserts that the gym has an active subscription enabling the specified feature.
 */
export async function assertPlanFeature(gymId: string, feature: FeatureKey): Promise<PlanConfig> {
  const { plan, config } = await getGymSubscription(gymId);

  if (!config.features[feature]) {
    const requiredTier =
      feature === "workouts_and_diets" || feature === "group_classes" || feature === "staff_rbac"
        ? "Performance Gym (Pro)"
        : feature === "hardware_relay_api" || feature === "multi_branch"
        ? "Enterprise Chain (Business)"
        : "Single Facility (Starter)";

    throw new Error(
      `PlanLimitReached: This feature requires the ${requiredTier} tier. Your workspace is currently on ${config.name}. Please upgrade in Settings → Subscription.`
    );
  }

  return config;
}

/**
 * Asserts that the gym has not reached its athlete roster limit.
 */
export async function assertMemberQuota(gymId: string): Promise<void> {
  const { config } = await getGymSubscription(gymId);
  const currentMembers = await prisma.member.count({
    where: { gymId, deletedAt: null },
  });

  if (currentMembers >= config.maxMembers) {
    throw new Error(
      `PlanLimitReached: Your ${config.name} allows up to ${config.maxMembers} athletes (${currentMembers}/${config.maxMembers} enrolled). Upgrade your subscription to enroll more athletes.`
    );
  }
}

/**
 * Asserts that the gym has not reached its trainer quota.
 */
export async function assertTrainerQuota(gymId: string): Promise<void> {
  const { config } = await getGymSubscription(gymId);
  const currentTrainers = await prisma.trainer.count({
    where: { gymId, deletedAt: null, isActive: true },
  });

  if (currentTrainers >= config.maxTrainers) {
    throw new Error(
      `PlanLimitReached: Your ${config.name} allows up to ${config.maxTrainers} coach/trainer profile${config.maxTrainers === 1 ? "" : "s"} (${currentTrainers}/${config.maxTrainers} added). Upgrade to Starter or Pro to add more coaches.`
    );
  }
}
