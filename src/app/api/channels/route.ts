import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import getRedis, { keys } from "@/lib/redis";
import { getTokenFromRequest, assertTenant } from "@/lib/auth";
import type { Channel } from "@/types";

// GET /api/channels?tenantId=xxx
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") || "";
  const user = getTokenFromRequest(req);
  const err = assertTenant(user, tenantId);
  if (err) return err;

  const redis = getRedis();
  const ids = await redis.smembers(keys.tenantChannels(tenantId));

  const channels = await Promise.all(
    ids.map(async (id) => {
      const raw = await redis.get(keys.channel(id));
      return raw ? (JSON.parse(raw) as Channel) : null;
    })
  );

  return Response.json(channels.filter(Boolean).sort((a, b) =>
    a!.name.localeCompare(b!.name)
  ));
}

// POST /api/channels
export async function POST(req: NextRequest) {
  const { tenantId, name, description } = await req.json();
  const user = getTokenFromRequest(req);
  const err = assertTenant(user, tenantId);
  if (err) return err;

  if (!name?.trim()) {
    return Response.json({ error: "Channel name required" }, { status: 400 });
  }

  const redis = getRedis();
  const channel: Channel = {
    id: uuid(),
    tenantId,
    name: name.trim().toLowerCase().replace(/\s+/g, "-"),
    description,
    createdAt: new Date().toISOString(),
  };

  await redis.set(keys.channel(channel.id), JSON.stringify(channel));
  await redis.sadd(keys.tenantChannels(tenantId), channel.id);

  return Response.json(channel, { status: 201 });
}
