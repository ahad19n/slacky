import { Kafka, Producer, logLevel } from "kafkajs";
import getRedis, { keys } from "./redis";
import type { Message } from "@/types";

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const TOPIC = "slacky.messages";

let kafka: Kafka;
let producer: Producer;
let producerReady = false;

function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({
      clientId: "slacky-app",
      brokers: [KAFKA_BROKER],
      logLevel: logLevel.WARN,
    });
  }
  return kafka;
}

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = getKafka().producer();
  }
  if (!producerReady) {
    await producer.connect();
    producerReady = true;
    console.log("[Kafka] Producer connected");
  }
  return producer;
}

export async function publishMessage(message: Message): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic: TOPIC,
    messages: [
      {
        key: `${message.tenantId}:${message.channelId}`,
        value: JSON.stringify(message),
      },
    ],
  });
}

// ── Consumer (run once at startup in server.js context) ────────────
export async function startConsumer(): Promise<void> {
  const consumer = getKafka().consumer({ groupId: "slacky-consumers" });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
  console.log("[Kafka] Consumer connected and subscribed");

  const redis = getRedis();

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const msg: Message = JSON.parse(message.value.toString());

        // 1. Persist to Redis list (capped at 200 messages per channel)
        const msgKey = keys.messages(msg.tenantId, msg.channelId);
        await redis.lpush(msgKey, JSON.stringify(msg));
        await redis.ltrim(msgKey, 0, 199);

        // 2. Publish to Redis pub/sub so Socket.IO server picks it up
        await redis.publish(
          keys.tenantMessagePub(msg.tenantId),
          JSON.stringify(msg)
        );
      } catch (err) {
        console.error("[Kafka] Consumer error", err);
      }
    },
  });
}
