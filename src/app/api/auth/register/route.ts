import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import getRedis, { keys } from "@/lib/redis";
import { signToken } from "@/lib/auth";
import type { Tenant, User } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { workspaceName, workspaceSlug, username, email, password, mode } =
      await req.json();

    // mode = "create" (new workspace) | "join" (existing workspace)
    if (!workspaceSlug || !username || !email || !password) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    const redis = getRedis();
    const existingTenantId = await redis.get(keys.tenantBySlug(workspaceSlug));

    let tenantId: string;

    if (mode === "join") {
      // ── Join existing workspace ──────────────────────────────
      if (!existingTenantId) {
        return Response.json({ error: "Workspace not found" }, { status: 404 });
      }

      // Check email not already registered in this tenant
      const existingUserId = await redis.get(keys.userByEmail(existingTenantId, email));
      if (existingUserId) {
        return Response.json({ error: "Email already registered in this workspace" }, { status: 409 });
      }

      tenantId = existingTenantId;
    } else {
      // ── Create new workspace ─────────────────────────────────
      if (!workspaceName) {
        return Response.json({ error: "Workspace name is required" }, { status: 400 });
      }
      if (existingTenantId) {
        return Response.json({ error: "Workspace URL already taken" }, { status: 409 });
      }

      const tenant: Tenant = {
        id: uuid(),
        name: workspaceName,
        slug: workspaceSlug,
        createdAt: new Date().toISOString(),
      };
      tenantId = tenant.id;

      const generalChannel = {
        id: uuid(),
        tenantId,
        name: "general",
        description: "Company-wide announcements",
        createdAt: new Date().toISOString(),
      };

      const pipe = redis.pipeline();
      pipe.set(keys.tenant(tenantId), JSON.stringify(tenant));
      pipe.set(keys.tenantBySlug(workspaceSlug), tenantId);
      pipe.sadd(keys.allTenants(), tenantId);
      pipe.set(keys.channel(generalChannel.id), JSON.stringify(generalChannel));
      pipe.sadd(keys.tenantChannels(tenantId), generalChannel.id);
      await pipe.exec();
    }

    // ── Create user (common to both paths) ─────────────────────
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuid(),
      tenantId,
      username,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    const pipe = redis.pipeline();
    pipe.set(keys.user(user.id), JSON.stringify(user));
    pipe.set(keys.userByEmail(tenantId, email), user.id);
    pipe.sadd(keys.tenantUsers(tenantId), user.id);
    await pipe.exec();

    const token = signToken({ userId: user.id, tenantId, username, email });

    const res = Response.json({ ok: true, tenantId, tenantSlug: workspaceSlug, username });
    const headers = new Headers(res.headers);
    headers.append(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`
    );
    return new Response(res.body, { status: 200, headers });
  } catch (err) {
    console.error("[register]", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
