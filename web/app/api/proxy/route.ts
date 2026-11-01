import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, sessionCookieName } from "@/lib/session";

async function proxy(request: NextRequest) {
  const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  const token = process.env.ADMIN_API_TOKEN || "super_secret_admin_token_2026_xyz";
  const sessionSecret = process.env.SESSION_SECRET || "session_signing_secret_key_random_2026_abc";
  const session = request.cookies.get(sessionCookieName)?.value;
  const path = request.nextUrl.searchParams.get("path") || "";
  const isAvatarPath = /^\/admin\/users\/\d+\/avatar$/.test(path);
  if (!isAvatarPath && !isValidSessionToken(session, sessionSecret)) {
    return NextResponse.json({ detail: "Avval admin panelga kiring" }, { status: 401 });
  }
  if (!path.startsWith("/admin/") && !path.startsWith("/api/")) {
    return NextResponse.json({ detail: "Proxy path ruxsat etilmagan" }, { status: 400 });
  }
  const target = `${backend.replace(/\/$/, "")}${path}`;
  const orgId = request.headers.get("x-organization-id") || request.nextUrl.searchParams.get("organization_id");
  const headers: Record<string, string> = {
    "X-Admin-Token": token,
    "Content-Type": "application/json",
  };
  if (orgId) {
    headers["X-Organization-Id"] = orgId;
  }
  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.text();
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
