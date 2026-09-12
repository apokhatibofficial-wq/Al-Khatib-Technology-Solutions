import { GeoProviderError } from "./provider.js";
import type { GeoPoint, RouteResult } from "./provider.js";

interface OsrmRouteResponse {
  code: string;
  message?: string;
  routes?: { distance: number; duration: number; geometry: string }[];
}

/**
 * Real client for OSRM's documented HTTP API (http://project-osrm.org/docs/).
 * Note OSRM's coordinate order is lng,lat — the opposite of this codebase's
 * GeoPoint {lat, lng}, which is why every call here swaps them explicitly.
 */
export async function osrmRoute(baseUrl: string, from: GeoPoint, to: GeoPoint): Promise<RouteResult> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${baseUrl.replace(/\/$/, "")}/route/v1/driving/${coords}?overview=full&geometries=polyline&steps=false`;

  const res = await fetch(url);
  const body = (await res.json()) as OsrmRouteResponse;

  if (!res.ok || body.code !== "Ok" || !body.routes?.[0]) {
    throw new GeoProviderError(`OSRM routing failed: ${body.message ?? body.code}`);
  }

  const route = body.routes[0];
  return {
    distanceM: Math.round(route.distance),
    durationS: Math.round(route.duration),
    polyline: route.geometry,
  };
}
