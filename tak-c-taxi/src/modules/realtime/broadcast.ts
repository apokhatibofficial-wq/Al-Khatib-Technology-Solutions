import { prisma } from "../../db/client.js";
import { redis } from "./redis.js";
import { roomChannel } from "./rooms.js";
import { computeEtaSeconds } from "./eta.js";
import { findCityForPoint } from "../geo/city.js";
import { ACTIVE_RIDE_STATES } from "../rides/state-machine.js";
import type { GeoPoint } from "../geo/provider.js";

// column is already constrained to a 2-value literal union at compile
// time (every call site passes a hardcoded literal, never request input),
// so this was never reachable as an injection vector — but $queryRawUnsafe
// interpolates its first argument verbatim, so a fixed lookup rather than
// direct string interpolation is worth the two extra lines: it stays safe
// even if this signature is ever loosened to a plain `string`.
const RIDE_POINT_COLUMNS = { pickup: '"pickup"', dest: '"dest"' } as const;

async function ridePoint(rideId: string, column: "pickup" | "dest"): Promise<GeoPoint | null> {
  const rows = await prisma.$queryRawUnsafe<{ lat: number; lng: number }[]>(
    `SELECT ST_Y(${RIDE_POINT_COLUMNS[column]}::geometry) as lat, ST_X(${RIDE_POINT_COLUMNS[column]}::geometry) as lng FROM "Ride" WHERE id = $1`,
    rideId,
  );
  return rows[0] ?? null;
}

/**
 * Called on every POST /driver/location (§6's 2-8s cadence while active).
 * Fans a location update out to whichever of the three rooms actually
 * apply right now — never all three unconditionally.
 */
export async function broadcastDriverLocation(driverId: string, point: GeoPoint, accuracyM: number): Promise<void> {
  const payload: Record<string, unknown> = { driverId, lat: point.lat, lng: point.lng, accuracyM, at: new Date().toISOString() };
  await redis.publish(roomChannel({ kind: "driver", id: driverId }), JSON.stringify(payload));

  const city = await findCityForPoint(point);
  if (city) {
    await redis.publish(roomChannel({ kind: "city", id: city.id }), JSON.stringify(payload));
  }

  const ride = await prisma.ride.findFirst({
    where: { driverId, state: { in: [...ACTIVE_RIDE_STATES] } },
    orderBy: { requestedAt: "desc" },
  });
  if (!ride) return;

  // Heading to the rider before pickup, to the destination after (§6: ETA
  // is recomputed on every location update, from the real route — never
  // held constant or interpolated server-side).
  const headingToPickup = ride.state === "DRIVER_ACCEPTED" || ride.state === "DRIVER_ARRIVING";
  const target = await ridePoint(ride.id, headingToPickup ? "pickup" : "dest");
  const etaS = target ? await computeEtaSeconds(point, target) : null;

  await redis.publish(
    roomChannel({ kind: "ride", id: ride.id }),
    JSON.stringify({ ...payload, rideId: ride.id, etaS }),
  );
}
