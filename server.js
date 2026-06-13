const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const jwt = require("jsonwebtoken");
const { Kafka, logLevel } = require("kafkajs");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-in-prod";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const TOPIC = "slacky.messages";

// ── Kafka ──────────────────────────────────────────────────────────
const kafka = new Kafka({
  clientId: "slacky-server",
  brokers: [KAFKA_BROKER],
  logLevel: logLevel.WARN,
  retry: { retries: 10, initialRetryTime: 3000 },
});

async function startKafkaConsumer(redisPub) {
  const consumer = kafka.consumer({ groupId: "slacky-socket-consumers" });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
  console.log("[Kafka] Consumer ready");

  // Separate Redis for persistence
  const redisPersist = new Redis(REDIS_URL);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const msg = JSON.parse(message.value.toString());
        const msgKey = `tenant:${msg.tenantId}:channel:${msg.channelId}:messages`;
        await redisPersist.lpush(msgKey, JSON.stringify(msg));
        await redisPersist.ltrim(msgKey, 0, 199);
        await redisPub.publish(`tenant:${msg.tenantId}:messages`, JSON.stringify(msg));
      } catch (err) {
        console.error("[Kafka] Consumer error", err);
      }
    },
  });
}

async function ensureKafkaTopic() {
  const admin = kafka.admin();
  await admin.connect();
  const existing = await admin.listTopics();
  if (!existing.includes(TOPIC)) {
    await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 3 }] });
    console.log(`[Kafka] Created topic ${TOPIC}`);
  }
  await admin.disconnect();
}

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // ── Redis ──────────────────────────────────────────────────────
  const redisSub = new Redis(REDIS_URL);
  const redisPub = new Redis(REDIS_URL);

  redisSub.psubscribe("tenant:*:messages", (err) => {
    if (err) console.error("[Redis] psubscribe error", err);
    else console.log("[Redis] Subscribed to tenant channels");
  });

  // ── Socket.IO ──────────────────────────────────────────────────
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  redisSub.on("pmessage", (_pattern, channel, message) => {
    const tenantId = channel.split(":")[1];
    try {
      const payload = JSON.parse(message);
      io.to(`tenant:${tenantId}`).emit("new_message", payload);
    } catch (e) {
      console.error("[Socket] emit error", e);
    }
  });

  // JWT auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, tenantId, username } = socket.user;
    console.log(`[Socket] ${username} connected — tenant ${tenantId}`);
    socket.join(`tenant:${tenantId}`);

    socket.on("join_channel", (channelId) => {
      socket.join(`channel:${tenantId}:${channelId}`);
    });
    socket.on("leave_channel", (channelId) => {
      socket.leave(`channel:${tenantId}:${channelId}`);
    });
    socket.on("disconnect", () => {
      console.log(`[Socket] ${username} disconnected`);
    });
  });

  // Expose globals for API routes
  global._io = io;
  global._redisPub = redisPub;

  // ── Start Kafka (with retry) ───────────────────────────────────
  async function initKafka(retries = 10) {
    for (let i = 0; i < retries; i++) {
      try {
        await ensureKafkaTopic();
        await startKafkaConsumer(redisPub);
        return;
      } catch (err) {
        console.warn(`[Kafka] Attempt ${i + 1} failed, retrying in 5s…`, err.message);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    console.error("[Kafka] Failed to connect after retries. Messages will not persist.");
  }

  initKafka();

  server.listen(3000, () => {
    console.log("> Slacky ready on http://localhost:3000");
  });
});
