import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, sessionCookieName } from "@/lib/session";

export async function GET(request: NextRequest) {
  const secret = process.env.SESSION_SECRET || "";
  const token = request.cookies.get(sessionCookieName)?.value;
  return NextResponse.json({ authenticated: isValidSessionToken(token, secret) });
}
