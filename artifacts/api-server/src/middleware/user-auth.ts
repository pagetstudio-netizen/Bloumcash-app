import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const _userSecretFallback = "bloum-cash-user-secret-2026-yR7nQ";
if (!process.env.USER_JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("USER_JWT_SECRET env var must be set in production");
}
const USER_SECRET = process.env.USER_JWT_SECRET ?? _userSecretFallback;

export interface UserTokenPayload {
  id: number;
  email: string;
  iat: number;
}

export function signUserToken(payload: Omit<UserTokenPayload, "iat">): string {
  const data = Buffer.from(
    JSON.stringify({ ...payload, iat: Date.now() })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", USER_SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

export function verifyUserToken(token: string): UserTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Token invalide");
  const [data, sig] = parts;
  const expected = crypto.createHmac("sha256", USER_SECRET).update(data).digest("hex");
  if (sig !== expected) throw new Error("Signature invalide");
  const payload = JSON.parse(
    Buffer.from(data, "base64url").toString()
  ) as UserTokenPayload;
  const AGE_DAYS = 30;
  if (Date.now() - payload.iat > AGE_DAYS * 86400 * 1000)
    throw new Error("Token expiré");
  return payload;
}

declare module "express" {
  interface Request {
    currentUser?: UserTokenPayload;
  }
}

export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Authentification requise" });
    return;
  }
  try {
    req.currentUser = verifyUserToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

/** Extracts userId without blocking — returns null if not authenticated */
export function extractUser(req: Request): UserTokenPayload | null {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return verifyUserToken(token);
  } catch {
    return null;
  }
}
