// §6/§14: real-time delivery over a real WebSocket connection, plus a
// disconnect/reconnect cycle. Fastify's inject() can't upgrade a socket, so
// this spins up a real TCP listener (ephemeral port) and connects with a
// real `ws` client — genuine handshake, genuine Redis Pub/Sub fan-out
// (realtime/websocket.ts), genuine IDOR room-subscription check.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import type { FastifyInstance } from "fastify";
import { buildTestApp, listenTestApp, closeAll } from "../helpers/app.js";
import {
  resetDb,
  createTestCity,
  createPricingVersion,
  createRiderUser,
  createDriverWithUser,
  createRide,
} from "../helpers/fixtures.js";
import { createSession } from "../../src/modules/auth/sessions.js";
import { broadcastDriverLocation } from "../../src/modules/realtime/broadcast.js";

let app: FastifyInstance;
let wsUrl: (path: string) => string;

before(async () => {
  await resetDb();
  app = await buildTestApp();
  ({ wsUrl } = await listenTestApp(app));
});

after(async () => {
  await closeAll(app);
});

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
}

function waitForClose(socket: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    socket.once("close", (code, reason) => resolve({ code, reason: reason.toString() }));
  });
}

function waitForMessage(socket: WebSocket, predicate: (msg: any) => boolean, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error("timed out waiting for a matching WS message"));
    }, timeoutMs);
    function onMessage(raw: Buffer) {
      const msg = JSON.parse(raw.toString());
      if (predicate(msg)) {
        clearTimeout(timer);
        socket.off("message", onMessage);
        resolve(msg);
      }
    }
    socket.on("message", onMessage);
  });
}

test("ws: connecting without a token is closed with 4001", async () => {
  const socket = new WebSocket(wsUrl("/ws"));
  const closeEvent = await waitForClose(socket);
  assert.equal(closeEvent.code, 4001);
});

test("ws: connecting with a garbage token is closed with 4001", async () => {
  const socket = new WebSocket(wsUrl("/ws?token=not-a-real-jwt"));
  const closeEvent = await waitForClose(socket);
  assert.equal(closeEvent.code, 4001);
});

test("ws: subscribe, receive a real broadcast, disconnect, then a fresh connection can reconnect and subscribe again", async () => {
  const cityId = await createTestCity();
  const rider = await createRiderUser(cityId);
  const { driver } = await createDriverWithUser(cityId);
  const pickup = { lat: 35.9306, lng: 36.6339 }; // inside the fixture city's boundary
  const pricing = await createPricingVersion(cityId);
  const rideId = await createRide({
    userId: rider.id,
    driverId: driver.id,
    pricingVersionId: pricing.id,
    state: "DRIVER_ARRIVING", // an ACTIVE_RIDE_STATE — broadcastDriverLocation only publishes to the ride room for these
    pickup,
  });

  const riderTokens = await createSession("user", rider.id, undefined, {});

  // ---- first connection: subscribe, receive a real broadcast ----
  const socket1 = new WebSocket(wsUrl(`/ws?token=${riderTokens.accessToken}`));
  await waitForOpen(socket1);
  socket1.send(JSON.stringify({ type: "subscribe", room: `ride:${rideId}` }));
  const ack1 = await waitForMessage(socket1, (m) => m.type === "subscribed");
  assert.equal(ack1.room, `ride:${rideId}`);

  const firstMessage = waitForMessage(socket1, (m) => m.rideId === rideId);
  await broadcastDriverLocation(driver.id, { lat: 35.931, lng: 36.634 }, 15);
  const received1 = await firstMessage;
  assert.equal(received1.driverId, driver.id);
  assert.equal(received1.rideId, rideId);
  assert.equal(typeof received1.lat, "number");

  socket1.close();
  await waitForClose(socket1);

  // ---- reconnect: a fresh socket, fresh subscribe, still gets live updates ----
  const socket2 = new WebSocket(wsUrl(`/ws?token=${riderTokens.accessToken}`));
  await waitForOpen(socket2);
  socket2.send(JSON.stringify({ type: "subscribe", room: `ride:${rideId}` }));
  const ack2 = await waitForMessage(socket2, (m) => m.type === "subscribed");
  assert.equal(ack2.room, `ride:${rideId}`);

  const secondMessage = waitForMessage(socket2, (m) => m.rideId === rideId);
  await broadcastDriverLocation(driver.id, { lat: 35.932, lng: 36.635 }, 12);
  const received2 = await secondMessage;
  assert.equal(received2.driverId, driver.id);

  socket2.close();
  await waitForClose(socket2);
});

test("ws: a rider unrelated to the ride cannot subscribe to its room (IDOR)", async () => {
  const cityId = await createTestCity();
  const rider = await createRiderUser(cityId);
  const stranger = await createRiderUser(cityId);
  const { driver } = await createDriverWithUser(cityId);
  const pricing = await createPricingVersion(cityId);
  const rideId = await createRide({
    userId: rider.id,
    driverId: driver.id,
    pricingVersionId: pricing.id,
    state: "DRIVER_ARRIVING",
  });

  const strangerTokens = await createSession("user", stranger.id, undefined, {});
  const socket = new WebSocket(wsUrl(`/ws?token=${strangerTokens.accessToken}`));
  await waitForOpen(socket);
  socket.send(JSON.stringify({ type: "subscribe", room: `ride:${rideId}` }));
  const reply = await waitForMessage(socket, (m) => m.type === "error" || m.type === "subscribed");
  assert.equal(reply.type, "error");

  socket.close();
  await waitForClose(socket);
});

test("ws: a non-admin cannot subscribe to the admin-only city room", async () => {
  const cityId = await createTestCity();
  const rider = await createRiderUser(cityId);
  const riderTokens = await createSession("user", rider.id, undefined, {});

  const socket = new WebSocket(wsUrl(`/ws?token=${riderTokens.accessToken}`));
  await waitForOpen(socket);
  socket.send(JSON.stringify({ type: "subscribe", room: `city:${cityId}:drivers` }));
  const reply = await waitForMessage(socket, (m) => m.type === "error" || m.type === "subscribed");
  assert.equal(reply.type, "error");

  socket.close();
  await waitForClose(socket);
});
