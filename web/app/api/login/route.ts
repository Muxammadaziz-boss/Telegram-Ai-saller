import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSessionToken, sessionCookieName, sessionTtlSeconds } from "@/lib/session";

export async function POST(request: NextRequest) {
  const expected = process.env.DASHBOARD_PASSWORD || "";
  const secret = process.env.SESSION_SECRET || "";
  if (!expected || !secret) {
    return NextResponse.json({ detail: "DASHBOARD_PASSWORD yoki SESSION_SECRET sozlanmagan" }, { status: 500 });
  }
  let supplied = "";
  try {
    const body = await request.json();
    supplied = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ detail: "Login ma'lumoti noto'g'ri" }, { status: 400 });
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ detail: "Parol noto'g'ri" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtlSeconds,
  });
  return response;
}
