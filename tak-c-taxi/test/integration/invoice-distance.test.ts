// §4/§9: invoices are recomputed from what was actually recorded — the real
// GPS trail and real waiting-event durations — never re-used from the
// original quote estimate. This test builds a known GPS trail, computes its
// distance independently in JS (haversineMeters, a separate implementation
// from the SUT), and checks issueInvoice's real PostGIS-computed distance
// against it.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  resetDb,
  createTestCity,
  createPricingVersion,
  createRiderUser,
  createDriverWithUser,
  createRide,
  insertRideLocation,
  haversineMeters,
} from "../helpers/fixtures.js";
import { issueInvoice, InvoiceAlreadyExistsError } from "../../src/modules/pricing/invoice.js";
import { calculateFare } from "../../src/modules/pricing/engine.js";
import { prisma } from "../../src/db/client.js";
import { closeAll } from "../helpers/app.js";

let cityId: string;

before(async () => {
  await resetDb();
  cityId = await createTestCity();
});

after(async () => {
  await closeAll();
});

test("issueInvoice: distance matches an independently-computed haversine sum of the recorded trail", async () => {
  const pricing = await createPricingVersion(cityId, {
    baseFare: 50,
    pricePerUnit: 100,
    unitMeters: 1000,
    minFare: 100,
    waitingFeePerMin: 10,
  });
  const rider = await createRiderUser(cityId);
  const { driver } = await createDriverWithUser(cityId);

  const startedAt = new Date(Date.now() - 60_000);
  const rideId = await createRide({
    userId: rider.id,
    driverId: driver.id,
    pricingVersionId: pricing.id,
    state: "TRIP_STARTED",
    startedAt,
  });

  // One breadcrumb BEFORE startedAt — approach to pickup, must be excluded.
  await insertRideLocation(rideId, driver.id, { lat: 35.9200, lng: 36.6100 }, 10, new Date(startedAt.getTime() - 30_000));

  const trail = [
    { lat: 35.93, lng: 36.63 },
    { lat: 35.931, lng: 36.632 },
    { lat: 35.9325, lng: 36.6345 },
    { lat: 35.934, lng: 36.637 },
  ];
  for (let i = 0; i < trail.length; i++) {
    await insertRideLocation(rideId, driver.id, trail[i]!, 10, new Date(startedAt.getTime() + (i + 1) * 10_000));
  }

  let expectedDistance = 0;
  for (let i = 1; i < trail.length; i++) {
    expectedDistance += haversineMeters(trail[i - 1]!, trail[i]!);
  }

  const invoice = await issueInvoice(rideId);

  const relativeError = Math.abs(invoice.distanceM - expectedDistance) / expectedDistance;
  assert.ok(
    relativeError < 0.02,
    `invoice distance ${invoice.distanceM}m should be within 2% of the independently-computed ${expectedDistance.toFixed(1)}m (was ${(relativeError * 100).toFixed(2)}%)`,
  );

  const expectedFare = calculateFare(invoice.distanceM, invoice.waitingS, pricing);
  assert.equal(invoice.totalCents, expectedFare.totalCents);
  assert.equal(invoice.baseCents, expectedFare.baseCents);
  assert.equal(invoice.distanceCents, expectedFare.distanceCents);
});

test("issueInvoice: aggregates closed WaitingEvent durations into the bill", async () => {
  const pricing = await createPricingVersion(cityId, { waitingFeePerMin: 20 });
  const rider = await createRiderUser(cityId);
  const { driver } = await createDriverWithUser(cityId);
  const startedAt = new Date(Date.now() - 120_000);
  const rideId = await createRide({
    userId: rider.id,
    driverId: driver.id,
    pricingVersionId: pricing.id,
    state: "TRIP_STARTED",
    startedAt,
  });

  const waitStart = new Date(startedAt.getTime() + 10_000);
  const waitEnd = new Date(startedAt.getTime() + 190_000); // 180s = 3 minutes, exactly
  await prisma.$executeRaw`
    INSERT INTO "WaitingEvent" (id, "rideId", "driverId", "startedAt", "endedAt", "startPoint", "endPoint", "durationS")
    VALUES (${`wait_${rideId}`}, ${rideId}, ${driver.id}, ${waitStart}, ${waitEnd},
            ST_SetSRID(ST_MakePoint(36.63, 35.93), 4326), ST_SetSRID(ST_MakePoint(36.63, 35.93), 4326), 180)
  `;

  const invoice = await issueInvoice(rideId);
  assert.equal(invoice.waitingS, 180);
  assert.equal(invoice.waitingCents, 3 * 20); // 3 minutes * 20 cents/min
});

test("issueInvoice: falls back to the planned distance when no trail was recorded", async () => {
  const pricing = await createPricingVersion(cityId);
  const rider = await createRiderUser(cityId);
  const { driver } = await createDriverWithUser(cityId);
  const rideId = await createRide({
    userId: rider.id,
    driverId: driver.id,
    pricingVersionId: pricing.id,
    state: "TRIP_STARTED",
    startedAt: new Date(),
    plannedDistanceM: 4321,
  });

  const invoice = await issueInvoice(rideId);
  assert.equal(invoice.distanceM, 4321);
});

test("issueInvoice: refuses to issue a second invoice for the same ride", async () => {
  const pricing = await createPricingVersion(cityId);
  const rider = await createRiderUser(cityId);
  const { driver } = await createDriverWithUser(cityId);
  const rideId = await createRide({
    userId: rider.id,
    driverId: driver.id,
    pricingVersionId: pricing.id,
    state: "TRIP_STARTED",
    startedAt: new Date(),
  });

  await issueInvoice(rideId);
  await assert.rejects(() => issueInvoice(rideId), InvoiceAlreadyExistsError);
});
