import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const ADMIN_SECRET =
  process.env.ADMIN_JWT_SECRET ?? "bloum-cash-admin-secret-2026-xK9mP";

export interface AdminTokenPayload {
  id: number;
  email: string;
  role: string;
  iat: number;
}

export function signAdminToken(payload: Omit<AdminTokenPayload, "iat">): string {
  const data = Buffer.from(
    JSON.stringify({ ...payload, iat: Date.now() })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", ADMIN_SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Token invalide");
  const [data, sig] = parts;
  const expected = crypto.createHmac("sha256", ADMIN_SECRET).update(data).digest("hex");
  if (sig !== expected) throw new Error("Signature invalide");
  const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as AdminTokenPayload;
  const AGE_HOURS = 24;
  if (Date.now() - payload.iat > AGE_HOURS * 3600 * 1000) throw new Error("Token expiré");
  return payload;
}

declare module "express" {
  interface Request {
    admin?: AdminTokenPayload;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Authentification admin requise" });
    return;
  }
  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: "Token admin invalide ou expiré" });
  }
}
