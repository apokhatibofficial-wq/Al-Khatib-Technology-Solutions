// Seeds exactly the Idlib launch configuration the architecture doc itself
// specifies in §9 — not fabricated test data:
//
//   launch config (city=Idlib): price_per_unit=1.00, unit_meters=1500,
//   currency=USD, base_fare=0, min_fare=1.00, waiting_fee_per_min=0.05
//
// Run explicitly (`npm run db:seed`) — never automatically as part of a
// migration, matching §15/§9's "no fake data, nothing implicit" stance.
//
// The city boundary below is a rough rectangular bounding box around
// Idlib Governorate, NOT a surveyed administrative polygon. It's good
// enough to make city-lookup queries (findCityForPoint) work for local
// development; a real deployment needs the actual OSM/administrative
// boundary swapped in here before going live.
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../src/db/client.js";

const IDLIB_CENTROID = { lng: 36.6339, lat: 35.9306 };
const IDLIB_BBOX = {
  minLng: 36.0,
  minLat: 35.5,
  maxLng: 37.1,
  maxLat: 36.4,
};

async function main() {
  const existing = await prisma.city.findUnique({ where: { name: "Idlib" } });
  if (existing) {
    console.log(`City "Idlib" already exists (${existing.id}) — nothing to do.`);
    return;
  }

  const cityId = createId();
  const ring = [
    [IDLIB_BBOX.minLng, IDLIB_BBOX.minLat],
    [IDLIB_BBOX.maxLng, IDLIB_BBOX.minLat],
    [IDLIB_BBOX.maxLng, IDLIB_BBOX.maxLat],
    [IDLIB_BBOX.minLng, IDLIB_BBOX.maxLat],
    [IDLIB_BBOX.minLng, IDLIB_BBOX.minLat],
  ]
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(", ");

  await prisma.$executeRawUnsafe(
    `INSERT INTO "City" (id, name, centroid, boundary, "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2,
       ST_SetSRID(ST_MakePoint($3, $4), 4326),
       ST_SetSRID(ST_GeomFromText($5), 4326),
       true, now(), now())`,
    cityId,
    "Idlib",
    IDLIB_CENTROID.lng,
    IDLIB_CENTROID.lat,
    `POLYGON((${ring}))`,
  );

  await prisma.pricingVersion.create({
    data: {
      cityId,
      pricePerUnit: 100, // $1.00
      unitMeters: 1500,
      baseFare: 0,
      minFare: 100, // $1.00
      waitingFeePerMin: 5, // $0.05
      currency: "USD",
      effectiveFrom: new Date(),
    },
  });

  console.log(`Seeded City "Idlib" (${cityId}) with its launch pricing version.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
