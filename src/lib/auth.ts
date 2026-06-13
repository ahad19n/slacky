import jwt from "jsonwebtoken";
import type { JWTPayload } from "@/types";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-in-prod";
const EXPIRES_IN = "7d";

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function getTokenFromRequest(req: NextRequest): JWTPayload | null {
  try {
    const auth = req.headers.get("authorization");
    const cookieToken = req.cookies.get("token")?.value;
    const raw = auth?.startsWith("Bearer ") ? auth.slice(7) : cookieToken;
    if (!raw) return null;
    return verifyToken(raw);
  } catch {
    return null;
  }
}

/** Enforce that request belongs to the correct tenant */
export function assertTenant(
  user: JWTPayload | null,
  tenantId: string
): Response | null {
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.tenantId !== tenantId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
