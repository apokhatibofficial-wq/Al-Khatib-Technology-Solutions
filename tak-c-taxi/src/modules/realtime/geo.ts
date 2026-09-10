import { redis } from "./redis.js";
import type { GeoPoint } from "../geo/provider.js";

// §1's architecture diagram: "Redis (live locations, locks, queues)". This
// replaces phase 4's Postgres DriverLiveLocation stand-in — see that
// migration's note. One GEO sorted set (native GEOADD/GEOSEARCH, exactly
// what §7's candidate query needs) plus a companion per-driver hash for
// the fields GEO doesn't store (accuracy, staleness).
const GEO_KEY = "driver_geo";
const LOCATION_TTL_S = 90; // comfortably past §6's slowest cadence (30s idle) — a lapsed entry means the driver's gone dark.

function hashKey(driverId: string): string {
  return `driver_loc:${driverId}`;
}

export async function setDriverLocation(driverId: string, point: GeoPoint, accuracyM: number): Promise<void> {
  await redis
    .multi()
    .geoadd(GEO_KEY, point.lng, point.lat, driverId)
    .hset(hashKey(driverId), { lat: point.lat, lng: point.lng, accuracyM, updatedAt: Date.now() })
    .expire(hashKey(driverId), LOCATION_TTL_S)
    .exec();
}

export async function clearDriverLocation(driverId: string): Promise<void> {
  await redis.multi().zrem(GEO_KEY, driverId).del(hashKey(driverId)).exec();
}

export async function getDriverLocation(driverId: string): Promise<GeoPoint | null> {
  const hash = await redis.hmget(hashKey(driverId), "lat", "lng");
  if (!hash[0] || !hash[1]) return null;
  return { lat: Number(hash[0]), lng: Number(hash[1]) };
}

/**
 * §7's candidate query, against Redis instead of Postgres. Presence in the
 * GEO set is treated as "online" (added on POST /driver/online, removed on
 * going offline); a lapsed companion hash means a stale entry that's
 * cleaned up lazily here rather than trusted.
 */
export async function findNearbyDriverIds(point: GeoPoint, radiusM: number, limit: number): Promise<string[]> {
  const raw = (await redis.geosearch(
    GEO_KEY,
    "FROMLONLAT",
    point.lng,
    point.lat,
    "BYRADIUS",
    radiusM,
    "m",
    "ASC",
    "COUNT",
    limit,
  )) as string[];

  const fresh: string[] = [];
  for (const driverId of raw) {
    const exists = await redis.exists(hashKey(driverId));
    if (exists) {
      fresh.push(driverId);
    } else {
      await redis.zrem(GEO_KEY, driverId); // self-healing: drop the stale member
    }
  }
  return fresh;
}
