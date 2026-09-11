import { redis } from "../realtime/redis.js";
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
const USER_AGENT = "tak-c-taxi/0.1 (ride-hailing backend for Idlib; tak-c.taxi)";

// GEOCODER_URL can point at either a self-hosted Nominatim or the public
// nominatim.openstreetmap.org instance (see README's "Address search via
// public Nominatim" section — that's what production currently uses, since
// self-hosting doesn't fit the current server's RAM alongside everything
// else). The public instance's usage policy caps requests at "1 per
// second... the sum of traffic by all your users" — an aggregate ceiling
// across every end-user hitting this backend, not a per-user limit — and
// requires local caching of results. Both are enforced here unconditionally
// (not just when GEOCODER_URL happens to be the public host) since a
// self-hosted instance benefits from the same caching, and it keeps this
// module correct regardless of which one a deployment points at.
const MIN_REQUEST_INTERVAL_MS = 1100; // stay safely under "1 req/s"
const CACHE_TTL_SECONDS = 24 * 60 * 60; // addresses don't move; a day is safe

let throttleQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = (throttleQueue = throttleQueue.then(async () => {
    const now = Date.now();
    const delay = Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - now);
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();
  }));
  await wait;
}

async function cached<T>(cacheKey: string, fetchFresh: () => Promise<T>): Promise<T> {
  const hit = await redis.get(cacheKey);
  if (hit) return JSON.parse(hit) as T;

  await throttle();
  const result = await fetchFresh();
  await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  return result;
}

export async function nominatimGeocode(baseUrl: string, query: string): Promise<GeocodeResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  return cached(`geocode:${normalizedQuery}`, async () => {
    const url = `${baseUrl.replace(/\/$/, "")}/search?${new URLSearchParams({
      q: query,
      format: "json",
      limit: "5",
    })}`;

    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) throw new GeoProviderError(`Nominatim geocode failed: ${res.status} ${res.statusText}`);

    const body = (await res.json()) as NominatimResult[];
    return body.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name }));
  });
}

export async function nominatimReverse(baseUrl: string, point: GeoPoint): Promise<GeocodeResult> {
  // ~1.1m precision (5 decimal places) — plenty for cache-hit purposes
  // without meaningfully changing which address a reverse lookup resolves to.
  const cacheKey = `reverse:${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  return cached(cacheKey, async () => {
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
  });
}
