import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../db/client.js";
import { calculateFare } from "./engine.js";
import type { GeoPoint } from "../geo/provider.js";

export class InvoiceAlreadyExistsError extends Error {}

/**
 * §4: "عند الإنهاء يُعاد الحساب من المسافة المسجّلة فعليًا ومدة الانتظار
 * المخزّنة" — recomputed from what was actually recorded, never re-used
 * from the original quote's estimate. Called once, from POST
 * /rides/:id/end, after the ride has transitioned to TRIP_COMPLETED.
 */
export async function issueInvoice(rideId: string, closingWaitPoint?: GeoPoint) {
  const existing = await prisma.invoice.findUnique({ where: { rideId } });
  if (existing) throw new InvoiceAlreadyExistsError("Invoice already issued for this ride");

  const ride = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } });

  // Ending directly from WAITING (no explicit /waiting/stop first) leaves
  // one WaitingEvent open — close it now so its time isn't silently lost
  // from the bill.
  const openWait = await prisma.waitingEvent.findFirst({ where: { rideId, endedAt: null } });
  if (openWait) {
    if (closingWaitPoint) {
      await prisma.$executeRaw`
        UPDATE "WaitingEvent"
        SET "endedAt" = now(),
            "endPoint" = ST_SetSRID(ST_MakePoint(${closingWaitPoint.lng}, ${closingWaitPoint.lat}), 4326),
            "durationS" = EXTRACT(EPOCH FROM (now() - "startedAt"))::int
        WHERE id = ${openWait.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "WaitingEvent"
        SET "endedAt" = now(), "durationS" = EXTRACT(EPOCH FROM (now() - "startedAt"))::int
        WHERE id = ${openWait.id}
      `;
    }
  }

  const waitingAgg = await prisma.waitingEvent.aggregate({
    where: { rideId, durationS: { not: null } },
    _sum: { durationS: true },
  });
  const waitingS = waitingAgg._sum.durationS ?? 0;

  // Real distance from the recorded GPS trail during the trip itself
  // (from TRIP_STARTED onward — not the driver's approach to pickup).
  // Falls back to the quote's route-computed planned distance only when
  // there aren't enough breadcrumbs to form a line (e.g. a very short
  // trip, or a driver app that sent too few pings) — that fallback is
  // itself a real earlier route call, not an invented number.
  let distanceM = ride.plannedDistanceM;
  if (ride.startedAt) {
    const trail = await prisma.$queryRaw<{ distance: number | null }[]>`
      SELECT ST_Length(ST_MakeLine(point::geometry ORDER BY "serverTs")::geography) as distance
      FROM "RideLocation"
      WHERE "rideId" = ${rideId} AND "serverTs" >= ${ride.startedAt}
    `;
    const measured = trail[0]?.distance;
    if (measured && measured > 0) distanceM = Math.round(measured);
  }

  const pricingVersion = await prisma.pricingVersion.findUniqueOrThrow({ where: { id: ride.pricingVersionId } });
  const fare = calculateFare(distanceM, waitingS, pricingVersion);

  return prisma.invoice.create({
    data: {
      id: createId(),
      rideId,
      baseCents: fare.baseCents,
      distanceCents: fare.distanceCents,
      waitingCents: fare.waitingCents,
      extraCents: fare.extraCents,
      totalCents: fare.totalCents,
      currency: pricingVersion.currency,
      distanceM,
      waitingS,
      pricingVersionId: pricingVersion.id,
    },
  });
}
