import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName, verifySession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const secret = process.env.SESSION_SECRET || "";
  const token = request.cookies.get(sessionCookieName)?.value;
  const session = verifySession(token, secret);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      telegramUserId: session.telegramUserId,
      email: session.email,
      role: session.role,
      organizationId: session.organizationId,
      isPlatformOwner: session.role === "owner",
    },
  });
}
