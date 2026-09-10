import { Redis } from "ioredis";
import { env } from "../../config/env.js";

// Pub/Sub requires a dedicated connection per Redis's own protocol rules —
// a client in subscribe mode can't run ordinary commands (GEOADD etc.) on
// the same connection. Two clients, same server, per §2's "WebSocket +
// Redis Pub/Sub" choice.
export const redis = new Redis(env.REDIS_URL);
export const redisSubscriber = new Redis(env.REDIS_URL);
