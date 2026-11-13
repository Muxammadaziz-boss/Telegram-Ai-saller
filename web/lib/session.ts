import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "sales_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

export interface SessionPayload {
  userId: number;
  telegramUserId?: number;
  email?: string;
  role?: string;
  organizationId?: number;
  backendToken?: string;
  issuedAt: number;
}

function computeSignature(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`ai-sales:v2:${data}`).digest();
}

/**
 * Create a cryptographically signed, identity-bound session token.
 */
export function createSessionToken(
  payloadOrSecret: SessionPayload | string,
  secretParam?: string
): string {
  let payload: SessionPayload;
  let secret: string;

  if (typeof payloadOrSecret === "string") {
    // Legacy fallback: generate owner session for admin
    secret = payloadOrSecret;
    payload = {
      userId: 1,
      email: "admin@aisales.uz",
      role: "owner",
      organizationId: 1,
      issuedAt: Math.floor(Date.now() / 1000),
    };
  } else {
    payload = {
      ...payloadOrSecret,
      issuedAt: payloadOrSecret.issuedAt || Math.floor(Date.now() / 1000),
    };
    secret = secretParam || "";
  }

  if (!secret) {
    throw new Error("SESSION_SECRET must be provided to create a session token");
  }

  const encodedData = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = computeSignature(encodedData, secret).toString("hex");
  return `v2.${encodedData}.${signature}`;
}

/**
 * Verify and decode an identity-bound session token. Returns null on failure.
 */
export function verifySession(token: string | undefined, secret: string): SessionPayload | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v2") return null;

  const encodedData = parts[1];
  const providedSignatureHex = parts[2];

  const expectedSignature = computeSignature(encodedData, secret);
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(providedSignatureHex, "hex");
  } catch {
    return null;
  }

  if (expectedSignature.length !== actualSignature.length) return null;
  if (!timingSafeEqual(expectedSignature, actualSignature)) return null;

  try {
    const raw = Buffer.from(encodedData, "base64url").toString("utf-8");
    const payload = JSON.parse(raw) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.userId || typeof payload.userId !== "number") return null;
    if (!Number.isFinite(payload.issuedAt)) return null;
    if (payload.issuedAt > now + 60) return null; // Future timestamp guard
    if (now - payload.issuedAt > SESSION_TTL_SECONDS) return null; // Expired

    return payload;
  } catch {
    return null;
  }
}

/**
 * Boolean validation check for session token.
 */
export function isValidSessionToken(token: string | undefined, secret: string): boolean {
  return verifySession(token, secret) !== null;
}

export const sessionCookieName = COOKIE_NAME;
export const sessionTtlSeconds = SESSION_TTL_SECONDS;
