import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redis: Redis;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL);
    redis.on("error", (err) => console.error("[Redis]", err));
  }
  return redis;
}

export default getRedis;

// ── Key helpers ────────────────────────────────────────────────────
export const keys = {
  tenant: (id: string) => `tenant:${id}`,
  tenantBySlug: (slug: string) => `tenant_slug:${slug}`,
  allTenants: () => `tenants`,

  user: (id: string) => `user:${id}`,
  userByEmail: (tenantId: string, email: string) => `user_email:${tenantId}:${email}`,
  tenantUsers: (tenantId: string) => `tenant:${tenantId}:users`,

  channel: (id: string) => `channel:${id}`,
  tenantChannels: (tenantId: string) => `tenant:${tenantId}:channels`,

  messages: (tenantId: string, channelId: string) =>
    `tenant:${tenantId}:channel:${channelId}:messages`,

  // pub/sub channel
  tenantMessagePub: (tenantId: string) => `tenant:${tenantId}:messages`,
};
