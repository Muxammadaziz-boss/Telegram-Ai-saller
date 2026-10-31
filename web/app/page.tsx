import { cookies } from "next/headers";
import { isValidSessionToken, sessionCookieName } from "@/lib/session";
import Dashboard from "./Dashboard";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const initialAuthenticated = isValidSessionToken(
    token,
    process.env.SESSION_SECRET || ""
  );

  return <Dashboard initialAuthenticated={initialAuthenticated} />;
}
