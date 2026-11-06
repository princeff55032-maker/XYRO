import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createMobileAccessToken } from "@/lib/mobile-auth";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identifier?: string;
      password?: string;
    };
    const rawIdentifier = body.identifier?.trim();
    const password = body.password;

    if (!rawIdentifier || !password) {
      return NextResponse.json({ error: "Email, member ID, and password are required." }, { status: 400 });
    }

    const identifier = rawIdentifier.toLowerCase();
    const memberIdentifier = rawIdentifier.replace(/\s+/g, "");
    const phoneDigits = rawIdentifier.replace(/\D/g, "");
    const phoneCandidates = Array.from(
      new Set([rawIdentifier, phoneDigits, phoneDigits ? `+${phoneDigits}` : ""])
    ).filter(Boolean);
    const rateLimit = await checkRateLimit(
      `mobile-login:${await getClientIp()}:${identifier}`,
      5,
      15 * 60
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: { in: phoneCandidates } },
          { member: { memberId: { equals: memberIdentifier, mode: "insensitive" } } },
        ],
      },
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            isActive: true,
            deletedAt: true,
            gym: { select: { name: true, gymCode: true, status: true, deletedAt: true } },
          },
        },
      },
    });

    if (!user || user.role !== "CUSTOMER" || !user.password || !user.member) {
      return NextResponse.json({ error: "Invalid member credentials." }, { status: 401 });
    }

    if (
      user.status !== "ACTIVE" ||
      user.deletedAt ||
      !user.member.isActive ||
      user.member.deletedAt ||
      user.member.gym.status !== "ACTIVE" ||
      user.member.gym.deletedAt
    ) {
      return NextResponse.json({ error: "This member account is not active." }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: "Invalid member credentials." }, { status: 401 });

    const accessToken = await createMobileAccessToken(user.id);
    return NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberId: user.member.memberId,
        gymName: user.member.gym.name,
        gymCode: user.member.gym.gymCode,
      },
    });
  } catch (error) {
    console.error("[Mobile Login Error]:", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
