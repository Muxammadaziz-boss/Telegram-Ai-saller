import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { sessionCookieName, verifySession } from "@/lib/session";

function signBackendJwt(userId: number, email: string, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(userId),
      email,
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function proxy(request: NextRequest) {
  const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  const sessionSecret = process.env.SESSION_SECRET;
  const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;

  if (!sessionSecret) {
    return NextResponse.json(
      { detail: "Server sozlamasida xatolik: SESSION_SECRET mavjud emas" },
      { status: 500 }
    );
  }

  const session = request.cookies.get(sessionCookieName)?.value;
  const sessionData = verifySession(session, sessionSecret);

  // All proxy endpoints (including avatar routes) require a cryptographically verified session
  if (!sessionData) {
    return NextResponse.json({ detail: "Avval admin panelga kiring" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path") || "";
  if (!path.startsWith("/admin/") && !path.startsWith("/api/")) {
    return NextResponse.json({ detail: "Proxy path ruxsat etilmagan" }, { status: 400 });
  }

  const target = `${backend.replace(/\/$/, "")}${path}`;
  const requestedOrgId =
    request.headers.get("x-organization-id") || request.nextUrl.searchParams.get("organization_id");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Attach identity: Forward cryptographically signed JWT for the verified user identity
  if (jwtSecret) {
    const userJwt = signBackendJwt(
      sessionData.userId,
      sessionData.email || `user_${sessionData.userId}@aisales.uz`,
      jwtSecret
    );
    headers["Authorization"] = `Bearer ${userJwt}`;
  } else if (sessionData.backendToken) {
    headers["Authorization"] = `Bearer ${sessionData.backendToken}`;
  } else {
    return NextResponse.json(
      { detail: "JWT_SECRET sozlanmagan — autentifikatsiya amalga oshirilmadi" },
      { status: 500 }
    );
  }

  // Tenant scoping: Forward target organization ID (backend verifies user's membership)
  const targetOrgId = requestedOrgId || (sessionData.organizationId ? String(sessionData.organizationId) : null);
  if (targetOrgId) {
    headers["X-Organization-Id"] = targetOrgId;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const response = await fetch(target, init);
    const contentType = response.headers.get("content-type") || "application/json";
    const data = await response.arrayBuffer();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": response.headers.get("cache-control") || "no-store",
      },
    });
  } catch {
    return NextResponse.json({ detail: "Backend bilan aloqa yo'q" }, { status: 502 });
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
