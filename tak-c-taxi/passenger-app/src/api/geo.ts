import { api } from "./client";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends GeoPoint {
  label: string;
}

export function geocode(query: string): Promise<{ results: GeocodeResult[] }> {
  return api.post("/geo/geocode", { query });
}
