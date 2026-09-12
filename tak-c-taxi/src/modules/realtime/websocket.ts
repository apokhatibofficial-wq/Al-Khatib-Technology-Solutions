import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { verifyAccessToken, type AccessTokenPayload } from "../auth/jwt.js";
import { redisSubscriber } from "./redis.js";
import { parseRoom, roomChannel, canSubscribe } from "./rooms.js";

// Local (this-process) fan-out from Redis Pub/Sub to connected sockets.
// Redis is the actual broadcast transport (§2) so this scales to multiple
// server instances; this map is just "which of *my* sockets care about
// this channel".
const localSubscribers = new Map<string, Set<WebSocket>>();

redisSubscriber.on("message", (channel, message) => {
  for (const socket of localSubscribers.get(channel) ?? []) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
});

function addLocalSubscriber(channel: string, socket: WebSocket): void {
  let set = localSubscribers.get(channel);
  if (!set) {
    set = new Set();
    localSubscribers.set(channel, set);
    void redisSubscriber.subscribe(channel);
  }
  set.add(socket);
}

function removeSocketFromAll(socket: WebSocket): void {
  for (const [channel, set] of localSubscribers) {
    if (set.delete(socket) && set.size === 0) {
      localSubscribers.delete(channel);
      void redisSubscriber.unsubscribe(channel);
    }
  }
}

export async function registerRealtimeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/ws", { websocket: true }, (socket, request) => {
    void (async () => {
      const token = (request.query as Record<string, string>)?.["token"];
      let actor: AccessTokenPayload;
      try {
        if (!token) throw new Error("missing token");
        actor = await verifyAccessToken(token);
      } catch {
        socket.close(4001, "unauthorized");
        return;
      }

      socket.on("close", () => removeSocketFromAll(socket));

      socket.on("message", (raw) => {
        void (async () => {
          let msg: { type?: string; room?: string };
          try {
            msg = JSON.parse(raw.toString());
          } catch {
            socket.send(JSON.stringify({ type: "error", error: "invalid JSON" }));
            return;
          }

          if (msg.type === "subscribe" && msg.room) {
            const room = parseRoom(msg.room);
            if (!room || !(await canSubscribe(actor, room))) {
              socket.send(JSON.stringify({ type: "error", error: `cannot subscribe to ${msg.room}` }));
              return;
            }
            addLocalSubscriber(roomChannel(room), socket);
            socket.send(JSON.stringify({ type: "subscribed", room: msg.room }));
            return;
          }

          socket.send(JSON.stringify({ type: "error", error: "unknown message type" }));
        })();
      });
    })();
  });
}
