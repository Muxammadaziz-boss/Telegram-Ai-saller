import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSessionToken, SessionPayload, sessionCookieName, sessionTtlSeconds } from "@/lib/session";

// In-memory rate limiting tracker: ip/identifier -> timestamp[]
const loginAttempts = new Map<string, number[]>();

function checkRateLimit(key: string, maxAttempts = (process.env.NODE_ENV === "production" ? 10 : 100), windowMs = 60000): boolean {
  const now = Date.now();
  const attempts = (loginAttempts.get(key) || []).filter((t) => now - t < windowMs);
  if (attempts.length >= maxAttempts) {
    return false;
  }
  attempts.push(now);
  loginAttempts.set(key, attempts);
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { detail: "Juda ko'p urinishlar qilindi. 1 daqiqadan so'ng qayta urinib ko'ring." },
      { status: 429 }
    );
  }

  const expectedDashboardPassword = process.env.DASHBOARD_PASSWORD || "";
  const secret = process.env.SESSION_SECRET || "";
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

  if (!secret) {
    return NextResponse.json({ detail: "SESSION_SECRET sozlanmagan" }, { status: 500 });
  }

  let supplied = "";
  let telegramIdNum: number | undefined = undefined;
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

  // 1. Try individual backend authentication (/api/v1/auth/login)
  let backendToken: string | undefined = undefined;
  let authenticatedUserId: number | undefined = undefined;
  let authenticatedRole = "admin";

  try {
    const backendRes = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: supplied }),
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      backendToken = data.access_token;
      authenticatedUserId = data.user_id;

      // Fetch user profile from backend to get is_platform_owner and telegram_user_id
      const profileRes = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${backendToken}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.is_platform_owner) {
          authenticatedRole = "owner";
        }
        if (profile.telegram_user_id) {
          telegramIdNum = profile.telegram_user_id;
        }
      }
    }
  } catch {
    // Backend may be offline or unreachable; fall through to dashboard password check
  }

  // 2. Fallback to master DASHBOARD_PASSWORD if backend login did not match
  if (!backendToken) {
    if (!expectedDashboardPassword) {
      return NextResponse.json({ detail: "Email yoki parol noto'g'ri" }, { status: 401 });
    }

    const a = Buffer.from(expectedDashboardPassword);
    const b = Buffer.from(supplied);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ detail: "Parol noto'g'ri" }, { status: 401 });
    }

    authenticatedUserId = 1;
    authenticatedRole = "owner";
  }

  const sessionPayload: SessionPayload = {
    userId: authenticatedUserId || 1,
    telegramUserId: telegramIdNum,
    email,
    role: authenticatedRole,
    organizationId: orgId,
    backendToken,
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
