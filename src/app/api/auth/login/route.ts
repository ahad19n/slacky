import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import getRedis, { keys } from "@/lib/redis";
import { signToken } from "@/lib/auth";
import type { User } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { workspaceSlug, email, password } = await req.json();

    if (!workspaceSlug || !email || !password) {
      return Response.json({ error: "All fields required" }, { status: 400 });
    }

    const redis = getRedis();

    // Resolve tenant
    const tenantId = await redis.get(keys.tenantBySlug(workspaceSlug));
    if (!tenantId) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Resolve user
    const userId = await redis.get(keys.userByEmail(tenantId, email));
    if (!userId) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const raw = await redis.get(keys.user(userId));
    if (!raw) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user: User = JSON.parse(raw);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      tenantId,
      username: user.username,
      email: user.email,
    });

    const res = Response.json({ ok: true, tenantId, tenantSlug: workspaceSlug, username: user.username });
    const headers = new Headers(res.headers);
    headers.append(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`
    );

    return new Response(res.body, { status: 200, headers });
  } catch (err) {
    console.error("[login]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
