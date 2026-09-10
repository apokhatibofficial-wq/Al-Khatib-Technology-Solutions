import { prisma } from "../../db/client.js";
import type { AccessTokenPayload } from "../auth/jwt.js";

// §6's three room shapes, verbatim: ride:{id}, driver:{id}, city:{id}:drivers (admin only).
export type Room = { kind: "ride"; id: string } | { kind: "driver"; id: string } | { kind: "city"; id: string };

export function roomChannel(room: Room): string {
  if (room.kind === "city") return `city:${room.id}:drivers`;
  return `${room.kind}:${room.id}`;
}

export function parseRoom(raw: string): Room | null {
  const cityMatch = raw.match(/^city:(.+):drivers$/);
  if (cityMatch) return { kind: "city", id: cityMatch[1]! };
  const match = raw.match(/^(ride|driver):(.+)$/);
  if (!match) return null;
  return { kind: match[1] as "ride" | "driver", id: match[2]! };
}

/** Same IDOR discipline as GET /rides/:id (§10) — extended to WS subscriptions. */
export async function canSubscribe(actor: AccessTokenPayload, room: Room): Promise<boolean> {
  if (actor.actorType === "admin") return true;

  if (room.kind === "city") return false; // §6: "للأدمن فقط"

  if (room.kind === "driver") {
    const driver = await prisma.driver.findUnique({ where: { id: room.id } });
    return driver?.userId === actor.actorId;
  }

  if (room.kind === "ride") {
    const ride = await prisma.ride.findUnique({ where: { id: room.id } });
    if (!ride) return false;
    if (ride.userId === actor.actorId) return true;
    if (ride.driverId) {
      const driver = await prisma.driver.findUnique({ where: { id: ride.driverId } });
      if (driver?.userId === actor.actorId) return true;
    }
  }
  return false;
}
