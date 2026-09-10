import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../db/client.js";
import { geoProvider } from "../geo/index.js";
import { findCityForPoint } from "../geo/city.js";
import { calculateFare } from "./engine.js";
import type { GeoPoint } from "../geo/provider.js";

const QUOTE_TTL_MS = 2 * 60 * 1000; // 2 minutes — not specified by the doc, a documented default.

export class NoCityError extends Error {}
export class NoPricingError extends Error {}

export interface QuoteInput {
  pickup: GeoPoint;
  dest: GeoPoint;
  pickupLabel: string;
  destLabel: string;
}

export interface QuoteResult {
  quoteId: string;
  distanceM: number;
  durationS: number;
  fareCents: number;
  currency: string;
  expiresAt: Date;
}

/** §4 POST /rides/quote. §9: this is the only place a fare number gets minted. */
export async function createQuote(input: QuoteInput): Promise<QuoteResult> {
  const city = await findCityForPoint(input.pickup);
  if (!city) throw new NoCityError("Pickup point is outside any active service area.");

  const pricingVersion = await prisma.pricingVersion.findFirst({
    where: { cityId: city.id, effectiveFrom: { lte: new Date() } },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!pricingVersion) throw new NoPricingError(`No active pricing configured for ${city.name}.`);

  const route = await geoProvider.route(input.pickup, input.dest);
  const fare = calculateFare(route.distanceM, 0, pricingVersion, 0);
  const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);

  const quoteId = createId();
  await prisma.$executeRaw`
    INSERT INTO "Quote" (
      id, "cityId", pickup, dest, "pickupLabel", "destLabel",
      "distanceM", "durationS", "routePolyline",
      "fareCents", currency, "pricingVersionId", "expiresAt", "createdAt"
    ) VALUES (
      ${quoteId}, ${city.id},
      ST_SetSRID(ST_MakePoint(${input.pickup.lng}, ${input.pickup.lat}), 4326),
      ST_SetSRID(ST_MakePoint(${input.dest.lng}, ${input.dest.lat}), 4326),
      ${input.pickupLabel}, ${input.destLabel},
      ${route.distanceM}, ${route.durationS}, ${route.polyline},
      ${fare.totalCents}, ${pricingVersion.currency}, ${pricingVersion.id}, ${expiresAt}, now()
    )
  `;

  return {
    quoteId,
    distanceM: route.distanceM,
    durationS: route.durationS,
    fareCents: fare.totalCents,
    currency: pricingVersion.currency,
    expiresAt,
  };
}
