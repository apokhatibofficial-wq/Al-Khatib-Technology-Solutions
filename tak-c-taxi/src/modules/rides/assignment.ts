import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../db/client.js";
import { transitionRide } from "./state-machine.js";
import type { GeoPoint } from "../geo/provider.js";

const SEARCH_RADIUS_M = 5000; // Not specified by the doc — a documented default.
const MAX_CANDIDATES = 8; // §7's pseudocode: "LIMIT 8".
const OFFER_TIMEOUT_MS = 20_000; // §7: "20s timeout each".

// In-process only — a scheduled offer-timeout doesn't survive a server
// restart. Acceptable for this phase; a durable job queue is exactly the
// kind of hardening §9 (tests) / production readiness would add later, not
// something to fake here.
const pendingTimeouts = new Map<string, NodeJS.Timeout>();

function clearPendingTimeout(rideId: string): void {
  const t = pendingTimeouts.get(rideId);
  if (t) {
    clearTimeout(t);
    pendingTimeouts.delete(rideId);
  }
}

/** §7: online, approved, not already offered this ride, nearest first. */
async function findCandidateDrivers(pickup: GeoPoint, excludeDriverIds: string[]): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ driverId: string }[]>`
    SELECT dl."driverId"
    FROM "DriverLiveLocation" dl
    JOIN "Driver" d ON d.id = dl."driverId"
    WHERE d."isOnline" = true
      AND d.status = 'APPROVED'
      AND dl."driverId" NOT IN (SELECT unnest(${excludeDriverIds}::text[]))
      AND ST_DWithin(dl.point, ST_SetSRID(ST_MakePoint(${pickup.lng}, ${pickup.lat}), 4326), ${SEARCH_RADIUS_M})
    ORDER BY ST_Distance(dl.point, ST_SetSRID(ST_MakePoint(${pickup.lng}, ${pickup.lat}), 4326))
    LIMIT ${MAX_CANDIDATES}
  `;
  return rows.map((r) => r.driverId);
}

/** Kicks off (or continues) an offer wave: send to the next untried candidate, or give up. */
async function offerNextCandidate(rideId: string, pickup: GeoPoint): Promise<void> {
  const alreadyOffered = (await prisma.rideOffer.findMany({ where: { rideId }, select: { driverId: true } })).map(
    (o) => o.driverId,
  );

  const candidates = await findCandidateDrivers(pickup, alreadyOffered);
  const next = candidates[0];

  if (!next) {
    await transitionRide(rideId, "NO_DRIVER_FOUND");
    return;
  }

  await prisma.rideOffer.create({
    data: { id: createId(), rideId, driverId: next, rank: alreadyOffered.length + 1 },
  });
  // First offer of the wave: SEARCHING_DRIVER -> DRIVER_ASSIGNED. Subsequent
  // ones (previous candidate declined/timed out): DRIVER_ASSIGNED -> itself.
  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } });
  if (ride.state === "SEARCHING_DRIVER" || ride.state === "DRIVER_ASSIGNED") {
    await transitionRide(rideId, "DRIVER_ASSIGNED");
  }

  const timer = setTimeout(() => {
    void expireOffer(rideId, next, pickup);
  }, OFFER_TIMEOUT_MS);
  pendingTimeouts.set(rideId, timer);
}

async function expireOffer(rideId: string, driverId: string, pickup: GeoPoint): Promise<void> {
  await prisma.rideOffer.updateMany({
    where: { rideId, driverId, respondedAt: null },
    data: { respondedAt: new Date(), response: "TIMEOUT" },
  });
  await offerNextCandidate(rideId, pickup);
}

/** §4 POST /rides — called once, right after a Ride is created in REQUESTED state. */
export async function startSearching(rideId: string, pickup: GeoPoint): Promise<void> {
  await transitionRide(rideId, "SEARCHING_DRIVER");
  await offerNextCandidate(rideId, pickup);
}

export class OfferNotAcceptableError extends Error {}

/**
 * §7's core safety property, implemented literally: a row lock on the Ride
 * itself (not any kind of app-level mutex) makes only one accept() call
 * ever win, even if two drivers press "accept" the same millisecond.
 */
export async function acceptOffer(rideId: string, driverId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ state: string }[]>`
      SELECT state FROM "Ride" WHERE id = ${rideId} FOR UPDATE
    `;
    const ride = rows[0];
    if (!ride) throw new OfferNotAcceptableError("Ride not found");
    if (ride.state !== "DRIVER_ASSIGNED") {
      throw new OfferNotAcceptableError("This ride is no longer accepting offers — someone else already won it.");
    }

    const offer = await tx.rideOffer.findFirst({
      where: { rideId, driverId, respondedAt: null },
      orderBy: { sentAt: "desc" },
    });
    if (!offer) {
      throw new OfferNotAcceptableError("Your offer for this ride has expired or was never sent.");
    }

    await tx.rideOffer.update({ where: { id: offer.id }, data: { respondedAt: new Date(), response: "ACCEPT" } });
    await tx.ride.update({ where: { id: rideId }, data: { state: "DRIVER_ACCEPTED", driverId, acceptedAt: new Date() } });
    await tx.rideStateEvent.create({
      data: { rideId, fromState: "DRIVER_ASSIGNED", toState: "DRIVER_ACCEPTED", actorId: driverId },
    });
  });

  clearPendingTimeout(rideId);
  // Accepting implies "now heading to pickup" — no separate client action
  // triggers this specific sub-transition (§8 lists the state; §4 lists no
  // endpoint for it).
  await transitionRide(rideId, "DRIVER_ARRIVING", { actorId: driverId });
}

export async function declineOffer(rideId: string, driverId: string, pickup: GeoPoint): Promise<void> {
  const updated = await prisma.rideOffer.updateMany({
    where: { rideId, driverId, respondedAt: null },
    data: { respondedAt: new Date(), response: "DECLINE" },
  });
  if (updated.count === 0) return; // already responded/expired — nothing to do
  clearPendingTimeout(rideId);
  await offerNextCandidate(rideId, pickup);
}
