// §9 محرك التسعير — the single source of fare truth. Pure function, no I/O:
// callers (quote.ts now, ride-completion in phase 6) fetch the effective
// PricingVersion and pass its rates in.
//
//   fare = max(min_fare,
//              base_fare
//            + (road_distance_m / unit_meters) * price_per_unit
//            + ceil_or_prorate(waiting_seconds / 60) * waiting_fee_per_min
//            + extras)
//
// The doc names the waiting-minutes step "ceil_or_prorate" without picking
// one — this implementation ceilings to the next full minute (how the
// physical taxi meters this app maps to actually bill waiting time).

export interface PricingRates {
  /** Cents. */
  baseFare: number;
  /** Cents per unitMeters of road distance. */
  pricePerUnit: number;
  unitMeters: number;
  /** Cents. */
  minFare: number;
  /** Cents per minute (or fraction, rounded up). */
  waitingFeePerMin: number;
}

export interface FareBreakdown {
  baseCents: number;
  distanceCents: number;
  waitingCents: number;
  extraCents: number;
  totalCents: number;
}

export function calculateFare(
  distanceM: number,
  waitingSeconds: number,
  rates: PricingRates,
  extraCents = 0,
): FareBreakdown {
  const baseCents = rates.baseFare;
  const distanceCents = Math.round((distanceM / rates.unitMeters) * rates.pricePerUnit);
  const waitingMinutes = Math.ceil(waitingSeconds / 60);
  const waitingCents = waitingMinutes * rates.waitingFeePerMin;

  const raw = baseCents + distanceCents + waitingCents + extraCents;
  const totalCents = Math.max(rates.minFare, raw);

  return { baseCents, distanceCents, waitingCents, extraCents, totalCents };
}
