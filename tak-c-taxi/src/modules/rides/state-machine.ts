import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../db/client.js";
import type { RideState } from "../../generated/prisma/enums.js";
import type { GeoPoint } from "../geo/provider.js";

// §8's diagram, encoded as an explicit allow-list:
//   REQUESTED → SEARCHING_DRIVER → DRIVER_ASSIGNED → DRIVER_ACCEPTED
//             → DRIVER_ARRIVING → DRIVER_ARRIVED → TRIP_STARTED ⇄ WAITING
//             → TRIP_COMPLETED
//   terminal: CANCELLED_BY_USER | CANCELLED_BY_DRIVER | NO_DRIVER_FOUND
//
// Two reconciliations of the doc's own text against itself, both noted
// where they're used: (1) §7's lock-check pseudocode guards on
// state='SEARCHING_DRIVER', but §8 puts DRIVER_ASSIGNED between
// SEARCHING_DRIVER and DRIVER_ACCEPTED — assignment.ts's accept lock
// checks DRIVER_ASSIGNED, §8's fuller state list wins. (2) DRIVER_ASSIGNED
// can loop to itself (self-transition, listed below) when an offer wave
// moves to the next candidate — the diagram is linear but doesn't say
// candidates are limited to one attempt.
const TRANSITIONS: Record<RideState, RideState[]> = {
  REQUESTED: ["SEARCHING_DRIVER", "CANCELLED_BY_USER"],
  SEARCHING_DRIVER: ["DRIVER_ASSIGNED", "NO_DRIVER_FOUND", "CANCELLED_BY_USER"],
  DRIVER_ASSIGNED: ["DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "NO_DRIVER_FOUND", "CANCELLED_BY_USER"],
  DRIVER_ACCEPTED: ["DRIVER_ARRIVING", "CANCELLED_BY_USER", "CANCELLED_BY_DRIVER"],
  DRIVER_ARRIVING: ["DRIVER_ARRIVED", "CANCELLED_BY_USER", "CANCELLED_BY_DRIVER"],
  DRIVER_ARRIVED: ["TRIP_STARTED", "CANCELLED_BY_USER", "CANCELLED_BY_DRIVER"],
  TRIP_STARTED: ["WAITING", "TRIP_COMPLETED", "CANCELLED_BY_DRIVER"],
  WAITING: ["TRIP_STARTED", "TRIP_COMPLETED", "CANCELLED_BY_DRIVER"],
  TRIP_COMPLETED: [],
  CANCELLED_BY_USER: [],
  CANCELLED_BY_DRIVER: [],
  NO_DRIVER_FOUND: [],
};

/**
 * A driver in any of these states owns exactly one ride right now. Used
 * everywhere something needs "this driver's current ride, if any" —
 * §7's "NOT in_ride" candidate filter (assignment.ts), attaching location
 * breadcrumbs to the right ride (rides/routes.ts), and deciding which
 * WebSocket rooms a location update fans out to (realtime/broadcast.ts).
 * One definition so those three can't quietly drift apart.
 */
export const ACTIVE_RIDE_STATES = ["DRIVER_ACCEPTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED", "WAITING"] as const;

/** Pure allow-list check, split out of transitionRide so it's unit-testable without a DB. */
export function isValidTransition(from: RideState, to: RideState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {}

/**
 * The only place Ride.state changes. Every transition gets a
 * RideStateEvent row with a timestamp and (when known) a location —
 * §8's explicit requirement, not just a handful of named columns on Ride.
 */
export async function transitionRide(
  rideId: string,
  toState: RideState,
  opts: { point?: GeoPoint; actorId?: string } = {},
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ state: RideState }[]>`
      SELECT state FROM "Ride" WHERE id = ${rideId} FOR UPDATE
    `;
    const current = rows[0];
    if (!current) throw new Error(`Ride ${rideId} not found`);

    if (!isValidTransition(current.state, toState)) {
      throw new InvalidTransitionError(`Cannot transition ride from ${current.state} to ${toState}`);
    }

    await tx.ride.update({ where: { id: rideId }, data: { state: toState } });

    if (opts.point) {
      await tx.$executeRaw`
        INSERT INTO "RideStateEvent" (id, "rideId", "fromState", "toState", point, "actorId", "occurredAt")
        VALUES (${createId()}, ${rideId}, ${current.state}::"RideState", ${toState}::"RideState",
                ST_SetSRID(ST_MakePoint(${opts.point.lng}, ${opts.point.lat}), 4326), ${opts.actorId ?? null}, now())
      `;
    } else {
      await tx.rideStateEvent.create({
        data: { rideId, fromState: current.state, toState, actorId: opts.actorId },
      });
    }
  });
}
