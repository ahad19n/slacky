import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import getRedis, { keys } from "@/lib/redis";
import { getTokenFromRequest, assertTenant } from "@/lib/auth";
import { publishMessage } from "@/lib/kafka";
import type { Message } from "@/types";

// GET /api/messages?tenantId=xxx&channelId=yyy
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get("tenantId") || "";
  const channelId = searchParams.get("channelId") || "";

  const user = getTokenFromRequest(req);
  const err = assertTenant(user, tenantId);
  if (err) return err;

  const redis = getRedis();
  const raw = await redis.lrange(keys.messages(tenantId, channelId), 0, 99);

  const messages: Message[] = raw
    .map((r) => {
      try { return JSON.parse(r) as Message; } catch { return null; }
    })
    .filter(Boolean)
    .reverse() as Message[]; // oldest first

  return Response.json(messages);
}

// POST /api/messages — send a message via Kafka
export async function POST(req: NextRequest) {
  const { tenantId, channelId, content } = await req.json();
  const user = getTokenFromRequest(req);
  const err = assertTenant(user, tenantId);
  if (err) return err;

  if (!content?.trim()) {
    return Response.json({ error: "Content required" }, { status: 400 });
  }

  const message: Message = {
    id: uuid(),
    tenantId,
    channelId,
    userId: user!.userId,
    username: user!.username,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  // Publish to Kafka → consumer persists + publishes to Redis → Socket.IO delivers
  await publishMessage(message);

  return Response.json(message, { status: 201 });
}
