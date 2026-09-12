import { api } from "./client";
import type { GeoPoint } from "./geo";

export interface Quote {
  distance_m: number;
  duration_s: number;
  fare: number;
  currency: string;
  quote_id: string;
  expires_at: string;
}

export function quoteRide(input: {
  pickup: GeoPoint;
  dest: GeoPoint;
  pickupLabel: string;
  destLabel: string;
}): Promise<Quote> {
  return api.post("/rides/quote", input);
}

export function createRide(quoteId: string): Promise<{ id: string; state: string }> {
  return api.post("/rides", { quote_id: quoteId });
}

export interface Ride {
  id: string;
  state: string;
  pickupLabel: string;
  destLabel: string;
  invoice: { totalCents: number; currency: string; distanceM: number; waitingS: number } | null;
}

export function getRide(id: string): Promise<Ride> {
  return api.get(`/rides/${id}`);
}

export function downloadInvoice(id: string): Promise<void> {
  return api.download(`/rides/${id}/invoice.pdf`, `tak-c-taxi-invoice-${id}.pdf`);
}
