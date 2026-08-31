import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { passwordSchema } from "@/lib/validations";

export async function POST(req: Request) {
  // 1. Enforce server-side session authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Active session required" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "Current password and new password are required" },
      { status: 400 }
    );
  }

  const parsedPassword = passwordSchema.safeParse(newPassword);
  if (!parsedPassword.success) {
    return NextResponse.json(
      { ok: false, error: parsedPassword.error.issues[0]?.message || "New password does not meet complexity requirements" },
      { status: 400 }
    );
  }

  // 2. Re-verify user identity and account status directly from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.deletedAt || user.status !== "ACTIVE" || !user.password) {
    return NextResponse.json(
      { ok: false, error: "User account is invalid or deactivated" },
      { status: 403 }
    );
  }

  // 3. Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return NextResponse.json(
      { ok: false, error: "Invalid current password" },
      { status: 400 }
    );
  }

  // 4. Hash new password and update
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      forcePasswordChange: false,
      resetToken: null,
      resetTokenExpires: null,
    },
  });

  return NextResponse.json({ ok: true, message: "Password updated successfully" });
}
