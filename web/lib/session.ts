import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "sales_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function signature(timestamp: string, secret: string) {
  return createHmac("sha256", secret).update(`ai-sales:v1:${timestamp}`).digest("hex");
}

export function createSessionToken(secret: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return `v1.${timestamp}.${signature(timestamp, secret)}`;
}

export function isValidSessionToken(token: string | undefined, secret: string) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const issuedAt = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60 || now - issuedAt > SESSION_TTL_SECONDS) return false;
  const expected = Buffer.from(signature(parts[1], secret), "hex");
  const actual = Buffer.from(parts[2], "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const sessionCookieName = COOKIE_NAME;
export const sessionTtlSeconds = SESSION_TTL_SECONDS;
