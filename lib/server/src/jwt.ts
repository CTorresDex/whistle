import { createHmac, timingSafeEqual } from "node:crypto";

// type#access-token — JWT, HS256, infinite ttl (no exp claim)
export interface TokenPayload {
  user_id: number;
  username: string;
}

function hmac(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

export function signJwt(payload: TokenPayload, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = hmac(`${header}.${body}`, secret).toString("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string, secret: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = hmac(`${header}.${body}`, secret);
  let given: Buffer;
  try {
    given = Buffer.from(signature!, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body!, "base64url").toString("utf8"));
    if (typeof payload?.user_id !== "number" || typeof payload?.username !== "string") return null;
    return { user_id: payload.user_id, username: payload.username };
  } catch {
    return null;
  }
}
