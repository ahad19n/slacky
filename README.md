# Slacky — Multi-Tenant Real-Time Chat

A Slack-style workspace messaging app built with Next.js, Kafka, Redis, and Socket.IO.

## Architecture

```
Browser
  │
  ├── HTTP  →  Next.js API Routes  →  Kafka Producer
  │                                        │
  │                                   Kafka Broker
  │                                        │
  │                                   Kafka Consumer
  │                                        │
  │                                   Redis (persist + pub/sub)
  │                                        │
  └── WebSocket  ←  Socket.IO Server  ←───┘
```

## Tech Decisions

| Requirement    | Implementation |
|----------------|---------------|
| **Next.js**    | App Router, server components, API routes |
| **Kafka**      | Message bus — POST /api/messages → Kafka → consumer persists + fans out |
| **Redis**      | Message storage (lists, capped at 200/channel) + pub/sub bridge to Socket.IO |
| **Socket.IO**  | Real-time delivery; JWT auth middleware; tenant-scoped rooms |
| **Multi-tenant** | Every key, Kafka message key, and socket room is namespaced by `tenantId` |
| **Security**   | JWT (HttpOnly cookie), bcrypt passwords, `assertTenant()` guard on every API route |

## Running with Docker

```bash
docker-compose up --build
```

Open http://localhost:3000

## Running Locally (dev)

```bash
# 1. Start infrastructure
docker-compose up zookeeper kafka redis -d

# 2. Install deps
npm install

# 3. Set env vars
export KAFKA_BROKER=localhost:9092
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=dev-secret

# 4. Start app (custom server for Socket.IO)
node server.js
```

## Multi-Tenancy

Each workspace registration creates an isolated tenant. Tenant isolation is enforced at:

- **API layer** — `assertTenant(user, tenantId)` returns 403 if JWT `tenantId` doesn't match
- **Redis keys** — `tenant:<id>:*` namespace
- **Kafka** — message key is `tenantId:channelId`
- **Socket.IO** — clients join `tenant:<id>` rooms; cross-tenant emit is impossible

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT signed with HS256, stored as HttpOnly cookie (no XSS access)
- Next.js middleware validates JWT on every protected route server-side
- Socket.IO connection rejected without valid JWT

## Quick Demo

1. Register workspace A at `/register`
2. Open incognito → register workspace B
3. Both workspaces are completely isolated — different channels, messages, users
