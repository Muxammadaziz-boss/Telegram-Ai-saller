import { cookies } from "next/headers";
import { sessionCookieName, verifySession } from "@/lib/session";
import Dashboard from "./Dashboard";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const session = verifySession(token, process.env.SESSION_SECRET || "");

  return (
    <Dashboard
      initialAuthenticated={!!session}
      initialUser={
        session
          ? {
              userId: session.userId,
              email: session.email,
              role: session.role,
              organizationId: session.organizationId,
              isPlatformOwner: session.role === "owner",
            }
          : null
      }
    />
  );
}
