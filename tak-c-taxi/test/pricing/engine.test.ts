import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateFare, type PricingRates } from "../../src/modules/pricing/engine.js";

const rates: PricingRates = {
  baseFare: 50,
  pricePerUnit: 100,
  unitMeters: 1000,
  minFare: 150,
  waitingFeePerMin: 10,
};

test("calculateFare: base + distance, no waiting, above min fare", () => {
  const fare = calculateFare(3000, 0, rates);
  assert.equal(fare.baseCents, 50);
  assert.equal(fare.distanceCents, 300); // 3000/1000 * 100
  assert.equal(fare.waitingCents, 0);
  assert.equal(fare.totalCents, 350);
});

test("calculateFare: waiting seconds ceiling to the next full minute", () => {
  const fareExact = calculateFare(0, 60, rates);
  assert.equal(fareExact.waitingCents, 10); // exactly 1 minute

  const fareOverBy1s = calculateFare(0, 61, rates);
  assert.equal(fareOverBy1s.waitingCents, 20); // 61s ceilings to 2 minutes, not prorated

  const fareUnder = calculateFare(0, 1, rates);
  assert.equal(fareUnder.waitingCents, 10); // any fraction of a minute still bills a full minute
});

test("calculateFare: minFare floors a small trip's raw total", () => {
  // base(50) + distance(100m -> 10) + waiting(0) = 60, below minFare(150)
  const fare = calculateFare(100, 0, rates);
  assert.equal(fare.totalCents, 150);
});

test("calculateFare: minFare does not clip a trip already above it", () => {
  const fare = calculateFare(20000, 0, rates); // base(50) + distance(2000) = 2050
  assert.equal(fare.totalCents, 2050);
});

test("calculateFare: extraCents is added on top and can itself push past minFare", () => {
  const fare = calculateFare(0, 0, rates, 500);
  assert.equal(fare.extraCents, 500);
  assert.equal(fare.totalCents, 550); // base(50) + extra(500) = 550 > minFare(150)
});

test("calculateFare: distance rounds to the nearest cent, not truncated", () => {
  // 1333m / 1000 * 100 = 133.3 -> rounds to 133
  const fare = calculateFare(1333, 0, { ...rates, minFare: 0 });
  assert.equal(fare.distanceCents, 133);
});

test("calculateFare: zero everything still charges at least minFare", () => {
  const fare = calculateFare(0, 0, rates);
  assert.equal(fare.totalCents, rates.minFare);
});
