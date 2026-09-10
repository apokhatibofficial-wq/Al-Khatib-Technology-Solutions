import { prisma } from "../../db/client.js";
import type { GeoPoint } from "./provider.js";

/**
 * Which City's service area (§3 boundary polygon) a point falls inside, if
 * any. Real PostGIS containment check — not a nearest-city guess — because
 * pricing is per-city and "no city hardcoded" (§9) means this lookup is the
 * only thing that's allowed to decide which PricingVersion applies.
 */
export async function findCityForPoint(point: GeoPoint): Promise<{ id: string; name: string } | null> {
  const rows = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name FROM "City"
    WHERE "isActive" = true
      AND ST_Contains(boundary::geometry, ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326))
    LIMIT 1
  `;
  return rows[0] ?? null;
}
