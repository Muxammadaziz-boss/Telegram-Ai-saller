import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, sessionCookieName } from "@/lib/session";

async function proxy(request: NextRequest) {
  const backend = process.env.BACKEND_URL;
  const token = process.env.ADMIN_API_TOKEN;
  const sessionSecret = process.env.SESSION_SECRET || "";
  const session = request.cookies.get(sessionCookieName)?.value;
  if (!isValidSessionToken(session, sessionSecret)) {
    return NextResponse.json({ detail: "Avval admin panelga kiring" }, { status: 401 });
  }
  if (!backend || !token) {
    return NextResponse.json({ detail: "BACKEND_URL yoki ADMIN_API_TOKEN sozlanmagan" }, { status: 500 });
  }
  const path = request.nextUrl.searchParams.get("path") || "";
  if (!path.startsWith("/admin/")) {
    return NextResponse.json({ detail: "Proxy path ruxsat etilmagan" }, { status: 400 });
  }
  const target = `${backend.replace(/\/$/, "")}${path}`;
  const init: RequestInit = {
    method: request.method,
    headers: { "X-Admin-Token": token, "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.text();
  try {
    const response = await fetch(target, init);
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "Backend bilan aloqa yo'q" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
