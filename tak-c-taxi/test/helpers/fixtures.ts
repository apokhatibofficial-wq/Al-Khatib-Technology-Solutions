// Shared fixture builders for integration tests. Every insert here is a
// real row via Prisma/raw SQL against the test database (DATABASE_URL must
// point at a dedicated test DB — see package.json's "test" script) — no
// mocked persistence layer.
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../src/db/client.js";
import type { RideState, AdminRole } from "../../src/generated/prisma/enums.js";

export interface GeoPoint {
  lat: number;
  lng: number;
}

let phoneCounter = 0;

/** Unique, E.164-valid (+963 + 9 digits) phone number per call — avoids the User.phone unique constraint colliding across tests. */
export function uniquePhone(): string {
  phoneCounter += 1;
  const suffix = (Date.now() % 1_000_000).toString().padStart(6, "0") + phoneCounter.toString().padStart(3, "0");
  return `+963${suffix}`;
}

const DEFAULT_BBOX = { minLng: 36.0, minLat: 35.5, maxLng: 37.1, maxLat: 36.4 };
const DEFAULT_CENTROID: GeoPoint = { lat: 35.9306, lng: 36.6339 };

/** Real polygon boundary (same shape as scripts/dev-seed.ts's Idlib bbox) so findCityForPoint's real ST_Contains works against fixture points. */
export async function createTestCity(bbox = DEFAULT_BBOX, centroid = DEFAULT_CENTROID): Promise<string> {
  const cityId = createId();
  const ring = [
    [bbox.minLng, bbox.minLat],
    [bbox.maxLng, bbox.minLat],
    [bbox.maxLng, bbox.maxLat],
    [bbox.minLng, bbox.maxLat],
    [bbox.minLng, bbox.minLat],
  ]
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(", ");

  await prisma.$executeRawUnsafe(
    `INSERT INTO "City" (id, name, centroid, boundary, "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), ST_SetSRID(ST_GeomFromText($5), 4326), true, now(), now())`,
    cityId,
    `Test City ${cityId}`,
    centroid.lng,
    centroid.lat,
    `POLYGON((${ring}))`,
  );
  return cityId;
}

export interface PricingOverrides {
  pricePerUnit?: number;
  unitMeters?: number;
  baseFare?: number;
  minFare?: number;
  waitingFeePerMin?: number;
  currency?: string;
}

export async function createPricingVersion(cityId: string, overrides: PricingOverrides = {}) {
  return prisma.pricingVersion.create({
    data: {
      cityId,
      pricePerUnit: overrides.pricePerUnit ?? 100,
      unitMeters: overrides.unitMeters ?? 1000,
      baseFare: overrides.baseFare ?? 50,
      minFare: overrides.minFare ?? 150,
      waitingFeePerMin: overrides.waitingFeePerMin ?? 10,
      currency: overrides.currency ?? "USD",
      effectiveFrom: new Date(Date.now() - 1000),
    },
  });
}

export async function createRiderUser(cityId?: string) {
  return prisma.user.create({ data: { phone: uniquePhone(), status: "ACTIVE", cityId } });
}

export async function createDriverWithUser(cityId?: string) {
  const user = await prisma.user.create({ data: { phone: uniquePhone(), status: "ACTIVE", cityId } });
  const driver = await prisma.driver.create({ data: { userId: user.id, age: 30, status: "APPROVED" } });
  return { user, driver };
}

export async function createAdmin(role: AdminRole = "SUPER_ADMIN") {
  return prisma.adminUser.create({ data: { email: `${createId()}@test.local`, role } });
}

export interface RideFixtureOptions {
  userId: string;
  driverId?: string | null;
  pricingVersionId: string;
  state?: RideState;
  pickup?: GeoPoint;
  dest?: GeoPoint;
  plannedDistanceM?: number;
  plannedDurationS?: number;
  quotedFareCents?: number;
  startedAt?: Date | null;
}

/** Raw-SQL Ride insert (geography columns aren't reachable via Prisma's query builder) — mirrors POST /rides's own insert shape. */
export async function createRide(opts: RideFixtureOptions): Promise<string> {
  const rideId = createId();
  const pickup = opts.pickup ?? { lat: 35.93, lng: 36.63 };
  const dest = opts.dest ?? { lat: 35.94, lng: 36.65 };
  await prisma.$executeRaw`
    INSERT INTO "Ride" (
      id, "userId", "driverId", state, pickup, dest, "pickupLabel", "destLabel",
      "plannedDistanceM", "plannedDurationS", "routePolyline",
      "quotedFareCents", "pricingVersionId", "requestedAt", "startedAt"
    ) VALUES (
      ${rideId}, ${opts.userId}, ${opts.driverId ?? null}, ${opts.state ?? "REQUESTED"}::"RideState",
      ST_SetSRID(ST_MakePoint(${pickup.lng}, ${pickup.lat}), 4326),
      ST_SetSRID(ST_MakePoint(${dest.lng}, ${dest.lat}), 4326),
      'Test pickup', 'Test destination',
      ${opts.plannedDistanceM ?? 2000}, ${opts.plannedDurationS ?? 300}, 'test-polyline',
      ${opts.quotedFareCents ?? 300}, ${opts.pricingVersionId}, now(), ${opts.startedAt ?? null}
    )
  `;
  return rideId;
}

export async function insertRideLocation(
  rideId: string,
  driverId: string,
  point: GeoPoint,
  accuracyM: number,
  serverTs: Date,
  deviceTs: Date = serverTs,
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "RideLocation" ("rideId", "driverId", point, "accuracyM", "deviceTs", "serverTs")
    VALUES (${rideId}, ${driverId}, ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326), ${accuracyM}, ${deviceTs}, ${serverTs})
  `;
}

export async function createRideOffer(rideId: string, driverId: string, rank: number) {
  return prisma.rideOffer.create({ data: { id: createId(), rideId, driverId, rank } });
}

/** Independent-of-SUT reference haversine, used only to cross-check PostGIS's ST_Length in invoice tests — never imported by product code. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Wipes every application table between test files so leftover rows from
 * one file can never affect another (a real bug hit earlier in this
 * project, manually, during phase 6 testing).
 *
 * Excludes tables owned by an extension (pg_depend deptype='e') as well as
 * _prisma_migrations — a first version of this helper truncated
 * unqualified `pg_tables` in 'public', which also caught PostGIS's own
 * spatial_ref_sys (a real base table, not just extension metadata) and
 * silently emptied it on every test file's setup. Caught while writing
 * this same test suite: ST_Length/geography casts started failing with
 * "Cannot find SRID (4326) in spatial_ref_sys" only ever between test
 * runs, never on a direct standalone query — this was why.
 */
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname != '_prisma_migrations'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}
