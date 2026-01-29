import "server-only";

import crypto from "node:crypto";

export type ImpersonationScope =
  | "read_only"
  | "support_write_limited";

export type ImpersonationTokenPayload = {
  iss: "pawpointers-admin";
  aud: "pawpointers-app";
  iat: number;
  exp: number;
  actor_staff_user_id: string;
  target_user_id?: string;
  target_tenant_id?: string;
  scope: ImpersonationScope;
  reason: string;
  ticket_id?: string;
};

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlJson(obj: any) {
  return base64url(JSON.stringify(obj));
}

function signHS256(message: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(message).digest());
}

export function mintImpersonationToken(
  payload: Omit<ImpersonationTokenPayload, "iss" | "aud" | "iat" | "exp"> & {
    ttlSeconds?: number;
  },
  secret: string
): string {
  const ttl = payload.ttlSeconds ?? 900;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload: ImpersonationTokenPayload = {
    iss: "pawpointers-admin",
    aud: "pawpointers-app",
    iat: now,
    exp: now + ttl,
    actor_staff_user_id: payload.actor_staff_user_id,
    target_user_id: payload.target_user_id,
    target_tenant_id: payload.target_tenant_id,
    scope: payload.scope,
    reason: payload.reason,
    ticket_id: payload.ticket_id,
  };

  const encodedHeader = base64urlJson(header);
  const encodedPayload = base64urlJson(fullPayload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signHS256(signingInput, secret);
  return `${signingInput}.${signature}`;
}

export function verifyImpersonationToken(
  token: string,
  secret: string
): { valid: true; payload: ImpersonationTokenPayload } | { valid: false; error: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, error: "invalid_format" };
    const [h, p, s] = parts;
    const signingInput = `${h}.${p}`;
    const expected = signHS256(signingInput, secret);
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) {
      return { valid: false, error: "bad_signature" };
    }
    const payloadJson = Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(payloadJson) as ImpersonationTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return { valid: false, error: "expired" };
    if (payload.iss !== "pawpointers-admin") return { valid: false, error: "bad_issuer" };
    if (payload.aud !== "pawpointers-app") return { valid: false, error: "bad_audience" };
    return { valid: true, payload };
  } catch (e: any) {
    return { valid: false, error: e?.message || "verify_failed" };
  }
}

