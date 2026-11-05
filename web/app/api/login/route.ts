import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSessionToken, SessionPayload, sessionCookieName, sessionTtlSeconds } from "@/lib/session";

export async function POST(request: NextRequest) {
  const expected = process.env.DASHBOARD_PASSWORD || "";
  const secret = process.env.SESSION_SECRET || "";
  if (!expected || !secret) {
    return NextResponse.json({ detail: "DASHBOARD_PASSWORD yoki SESSION_SECRET sozlanmagan" }, { status: 500 });
  }

  let supplied = "";
  let telegramIdNum = 6990611858;
  let email = "admin@aisales.uz";
  let orgId = 1;

  try {
    const body = await request.json();
    supplied = typeof body.password === "string" ? body.password : "";
    if (body.telegram_id) {
      const parsed = Number(body.telegram_id);
      if (Number.isFinite(parsed) && parsed > 0) {
        telegramIdNum = parsed;
      }
    }
    if (typeof body.email === "string" && body.email.includes("@")) {
      email = body.email.trim().toLowerCase();
    }
    if (typeof body.organization_id === "number" && body.organization_id > 0) {
      orgId = body.organization_id;
    }
  } catch {
    return NextResponse.json({ detail: "Login ma'lumoti noto'g'ri" }, { status: 400 });
  }

  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ detail: "Parol noto'g'ri" }, { status: 401 });
  }

  const isOwner = telegramIdNum === 6990611858 || email === "admin@aisales.uz";
  const sessionPayload: SessionPayload = {
    userId: isOwner ? 1 : 2,
    telegramUserId: telegramIdNum,
    email,
    role: isOwner ? "owner" : "admin",
    organizationId: orgId,
    issuedAt: Math.floor(Date.now() / 1000),
  };

  const response = NextResponse.json({
    ok: true,
    user: {
      userId: sessionPayload.userId,
      telegramUserId: sessionPayload.telegramUserId,
      email: sessionPayload.email,
      role: sessionPayload.role,
      organizationId: sessionPayload.organizationId,
    },
  });

  response.cookies.set(sessionCookieName, createSessionToken(sessionPayload, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtlSeconds,
  });

  return response;
}
