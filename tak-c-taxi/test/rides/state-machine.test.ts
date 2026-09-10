import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidTransition, ACTIVE_RIDE_STATES } from "../../src/modules/rides/state-machine.js";
import type { RideState } from "../../src/generated/prisma/enums.js";

const ALL_STATES: RideState[] = [
  "REQUESTED",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_ACCEPTED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "WAITING",
  "TRIP_COMPLETED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_DRIVER",
  "NO_DRIVER_FOUND",
];

const TERMINAL_STATES: RideState[] = ["TRIP_COMPLETED", "CANCELLED_BY_USER", "CANCELLED_BY_DRIVER", "NO_DRIVER_FOUND"];

// §8's happy-path diagram, walked edge by edge.
const HAPPY_PATH: [RideState, RideState][] = [
  ["REQUESTED", "SEARCHING_DRIVER"],
  ["SEARCHING_DRIVER", "DRIVER_ASSIGNED"],
  ["DRIVER_ASSIGNED", "DRIVER_ACCEPTED"],
  ["DRIVER_ACCEPTED", "DRIVER_ARRIVING"],
  ["DRIVER_ARRIVING", "DRIVER_ARRIVED"],
  ["DRIVER_ARRIVED", "TRIP_STARTED"],
  ["TRIP_STARTED", "WAITING"],
  ["WAITING", "TRIP_STARTED"],
  ["TRIP_STARTED", "TRIP_COMPLETED"],
];

test("state-machine: every happy-path edge is allowed", () => {
  for (const [from, to] of HAPPY_PATH) {
    assert.equal(isValidTransition(from, to), true, `${from} -> ${to} should be allowed`);
  }
});

test("state-machine: DRIVER_ASSIGNED can self-loop (next offer-wave candidate)", () => {
  assert.equal(isValidTransition("DRIVER_ASSIGNED", "DRIVER_ASSIGNED"), true);
});

test("state-machine: terminal states allow no outgoing transition at all", () => {
  for (const terminal of TERMINAL_STATES) {
    for (const target of ALL_STATES) {
      assert.equal(isValidTransition(terminal, target), false, `${terminal} -> ${target} should be blocked`);
    }
  }
});

test("state-machine: cannot skip ahead past unattended states", () => {
  assert.equal(isValidTransition("REQUESTED", "TRIP_STARTED"), false);
  assert.equal(isValidTransition("REQUESTED", "DRIVER_ACCEPTED"), false);
  assert.equal(isValidTransition("SEARCHING_DRIVER", "TRIP_COMPLETED"), false);
  assert.equal(isValidTransition("DRIVER_ACCEPTED", "TRIP_STARTED"), false);
});

test("state-machine: cannot move backwards", () => {
  assert.equal(isValidTransition("DRIVER_ARRIVED", "DRIVER_ARRIVING"), false);
  assert.equal(isValidTransition("TRIP_STARTED", "DRIVER_ARRIVED"), false);
  assert.equal(isValidTransition("TRIP_COMPLETED", "TRIP_STARTED"), false);
});

test("state-machine: cancellation is reachable pre-trip but not once a trip has started", () => {
  assert.equal(isValidTransition("REQUESTED", "CANCELLED_BY_USER"), true);
  assert.equal(isValidTransition("DRIVER_ACCEPTED", "CANCELLED_BY_USER"), true);
  assert.equal(isValidTransition("DRIVER_ACCEPTED", "CANCELLED_BY_DRIVER"), true);
  assert.equal(isValidTransition("TRIP_STARTED", "CANCELLED_BY_USER"), false); // rider can no longer cancel mid-trip
  assert.equal(isValidTransition("TRIP_STARTED", "CANCELLED_BY_DRIVER"), true); // driver still can (e.g. breakdown)
});

test("state-machine: ACTIVE_RIDE_STATES matches exactly the states where a driver owns one ride", () => {
  const expected: RideState[] = ["DRIVER_ACCEPTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED", "WAITING"];
  assert.deepEqual([...ACTIVE_RIDE_STATES].sort(), expected.sort());
});
