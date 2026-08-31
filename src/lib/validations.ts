import { z } from "zod";

// ============================================
// AUTH VALIDATIONS
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter (A-Z)")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter (a-z)")
  .regex(/[0-9]/, "Password must contain at least one number (0-9)")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character (!@#$%^&*)");

export const gymRegistrationSchema = z
  .object({
    gymName: z.string().min(2, "Gym name must be at least 2 characters").max(100),
    ownerName: z.string().min(2, "Owner name is required").max(100),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits").max(15),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().default("India"),
    gstNumber: z.string().optional(),
    termsAccepted: z.boolean().refine((val) => val === true, "You must accept the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });


// ============================================
// MEMBER VALIDATIONS
// ============================================

export const addMemberSchema = z.object({
  name: z.string().min(2, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  timeSlot: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  joinDate: z.string().optional(),
  notes: z.string().optional(),
  trainerId: z.string().optional(),
  planId: z.string().optional(),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
  discountValue: z.number().min(0).optional(),
});

export const updateMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  name: z.string().min(2, "Name is required").max(100).optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  timeSlot: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  trainerId: z.string().optional(),
});

export const updateMembershipSchema = z.object({
  membershipId: z.string().min(1, "Membership ID is required"),
  planId: z.string().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "PAUSED", "CANCELLED", "PENDING"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  autoRenew: z.boolean().optional(),
  notes: z.string().optional(),
});

// ============================================
// MEMBERSHIP PLAN VALIDATIONS
// ============================================

export const membershipPlanSchema = z.object({
  name: z.string().min(2, "Plan name is required"),
  description: z.string().optional(),
  durationDays: z.number().min(1, "Duration must be at least 1 day"),
  price: z.number().min(0, "Price must be positive"),
  features: z.array(z.string()).optional(),
  freezeDays: z.number().min(0).default(0),
  accessHoursStart: z.string().optional(),
  accessHoursEnd: z.string().optional(),
  classesIncluded: z.boolean().default(false),
  personalTraining: z.boolean().default(false),
});

// ============================================
// PAYMENT VALIDATIONS
// ============================================

export const paymentSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  membershipId: z.string().optional(),
  amount: z.number().min(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "ONLINE"]),
  status: z.enum(["PAID", "PENDING", "FAILED", "REFUNDED", "PARTIAL"]).default("PAID"),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

// ============================================
// ATTENDANCE VALIDATIONS
// ============================================

export const attendanceSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  method: z.enum(["QR_SCAN", "MANUAL", "MEMBER_QR"]).default("MANUAL"),
  notes: z.string().optional(),
});

// ============================================
// WORKOUT VALIDATIONS
// ============================================

export const workoutPlanSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  trainerId: z.string().optional(),
  name: z.string().min(2, "Plan name is required"),
  description: z.string().optional(),
  exercises: z.array(
    z.object({
      dayOfWeek: z.string(),
      exerciseName: z.string().min(1),
      muscleGroup: z.string().optional(),
      sets: z.number().min(1).default(3),
      reps: z.string().default("10"),
      weight: z.string().optional(),
      restSeconds: z.number().min(0).default(60),
      instructions: z.string().optional(),
      videoUrl: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
});

// ============================================
// DIET PLAN VALIDATIONS
// ============================================

export const dietPlanSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  trainerId: z.string().optional(),
  name: z.string().min(2, "Plan name is required"),
  description: z.string().optional(),
  totalCalories: z.number().optional(),
  meals: z.array(
    z.object({
      mealType: z.string().min(1),
      time: z.string().optional(),
      foodItems: z.string().min(1),
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fats: z.number().optional(),
      notes: z.string().optional(),
    })
  ),
});

// ============================================
// PROGRESS VALIDATIONS
// ============================================

export const progressSchema = z.object({
  weight: z.number().optional(),
  height: z.number().optional(),
  bodyFat: z.number().optional(),
  chest: z.number().optional(),
  waist: z.number().optional(),
  arms: z.number().optional(),
  thighs: z.number().optional(),
  notes: z.string().optional(),
});

// ============================================
// TRAINER VALIDATIONS
// ============================================

export const trainerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10).max(15),
  password: z.string().min(6).optional(),
  specialization: z.string().optional(),
  experience: z.string().optional(),
  bio: z.string().optional(),
});

// ============================================
// EXPENSE VALIDATIONS
// ============================================

export const expenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0, "Amount must be positive"),
  date: z.string(),
  notes: z.string().optional(),
});

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type GymRegistrationInput = z.infer<typeof gymRegistrationSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>;
export type DietPlanInput = z.infer<typeof dietPlanSchema>;
export type ProgressInput = z.infer<typeof progressSchema>;
export type TrainerInput = z.infer<typeof trainerSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
