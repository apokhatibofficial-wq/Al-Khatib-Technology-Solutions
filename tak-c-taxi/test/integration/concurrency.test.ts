// §7's single most safety-critical property: two drivers racing to accept
// the same ride, only one may ever win. This is enforced by a real
// `SELECT ... FOR UPDATE` row lock inside acceptOffer's transaction (see
// assignment.ts) — not an app-level mutex, which wouldn't survive multiple
// server instances. This test fires two real, concurrent transactions
// against real Postgres and checks the actual outcome, repeated several
// times so a race that only sometimes loses can't slip through on luck.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  resetDb,
  createTestCity,
  createPricingVersion,
  createRiderUser,
  createDriverWithUser,
  createRide,
  createRideOffer,
} from "../helpers/fixtures.js";
import { acceptOffer, OfferNotAcceptableError } from "../../src/modules/rides/assignment.js";
import { prisma } from "../../src/db/client.js";
import { closeAll } from "../helpers/app.js";

let cityId: string;
let pricingVersionId: string;

before(async () => {
  await resetDb();
  cityId = await createTestCity();
  const pricing = await createPricingVersion(cityId);
  pricingVersionId = pricing.id;
});

after(async () => {
  await closeAll();
});

async function setupRaceableRide(): Promise<{ rideId: string; driverAId: string; driverBId: string }> {
  const rider = await createRiderUser(cityId);
  const { driver: driverA } = await createDriverWithUser(cityId);
  const { driver: driverB } = await createDriverWithUser(cityId);
  const rideId = await createRide({ userId: rider.id, pricingVersionId, state: "DRIVER_ASSIGNED" });
  await createRideOffer(rideId, driverA.id, 1);
  await createRideOffer(rideId, driverB.id, 2);
  return { rideId, driverAId: driverA.id, driverBId: driverB.id };
}

const ITERATIONS = 8;

test(`concurrency: exactly one of two simultaneous accept() calls wins, across ${ITERATIONS} fresh rides`, async () => {
  for (let i = 0; i < ITERATIONS; i++) {
    const { rideId, driverAId, driverBId } = await setupRaceableRide();

    const results = await Promise.allSettled([acceptOffer(rideId, driverAId), acceptOffer(rideId, driverBId)]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1, `iteration ${i}: expected exactly one winner, got ${fulfilled.length}`);
    assert.equal(rejected.length, 1, `iteration ${i}: expected exactly one loser, got ${rejected.length}`);
    assert.ok(
      (rejected[0] as PromiseRejectedResult).reason instanceof OfferNotAcceptableError,
      `iteration ${i}: the loser must fail with OfferNotAcceptableError, not crash some other way`,
    );

    const ride = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } });
    assert.equal(ride.state, "DRIVER_ARRIVING", `iteration ${i}: ride should have moved on with exactly one driver`);
    assert.ok(
      ride.driverId === driverAId || ride.driverId === driverBId,
      `iteration ${i}: ride.driverId must be one of the two racing drivers`,
    );

    const acceptedOffers = await prisma.rideOffer.findMany({ where: { rideId, response: "ACCEPT" } });
    assert.equal(acceptedOffers.length, 1, `iteration ${i}: exactly one RideOffer should be marked ACCEPT`);
    assert.equal(acceptedOffers[0]!.driverId, ride.driverId);
  }
});

test("concurrency: a third, late accept() on an already-won ride is rejected", async () => {
  const { rideId, driverAId, driverBId } = await setupRaceableRide();
  const { driver: driverC } = await createDriverWithUser(cityId);
  await createRideOffer(rideId, driverC.id, 3);

  await acceptOffer(rideId, driverAId);

  await assert.rejects(() => acceptOffer(rideId, driverBId), OfferNotAcceptableError);
  await assert.rejects(() => acceptOffer(rideId, driverC.id), OfferNotAcceptableError);

  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } });
  assert.equal(ride.driverId, driverAId);
});
