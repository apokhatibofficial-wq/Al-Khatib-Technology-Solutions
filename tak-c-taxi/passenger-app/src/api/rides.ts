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

export function getRide(id: string): Promise<Record<string, unknown> & { id: string; state: string }> {
  return api.get(`/rides/${id}`);
}
