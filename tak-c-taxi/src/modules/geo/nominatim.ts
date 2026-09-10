import { GeoProviderError } from "./provider.js";
import type { GeoPoint, GeocodeResult } from "./provider.js";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// Nominatim's usage policy requires a descriptive User-Agent identifying the
// application — an anonymous/browser-looking UA gets silently rate-limited
// or blocked. This is a real, documented requirement, not a style choice.
const USER_AGENT = "tak-c-taxi/0.1 (self-hosted Nominatim client)";

export async function nominatimGeocode(baseUrl: string, query: string): Promise<GeocodeResult[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/search?${new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
  })}`;

  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new GeoProviderError(`Nominatim geocode failed: ${res.status} ${res.statusText}`);

  const body = (await res.json()) as NominatimResult[];
  return body.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name }));
}

export async function nominatimReverse(baseUrl: string, point: GeoPoint): Promise<GeocodeResult> {
  const url = `${baseUrl.replace(/\/$/, "")}/reverse?${new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lng),
    format: "json",
  })}`;

  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new GeoProviderError(`Nominatim reverse geocode failed: ${res.status} ${res.statusText}`);

  const body = (await res.json()) as NominatimResult | { error: string };
  if ("error" in body) throw new GeoProviderError(`Nominatim reverse geocode failed: ${body.error}`);

  return { lat: Number(body.lat), lng: Number(body.lon), label: body.display_name };
}
