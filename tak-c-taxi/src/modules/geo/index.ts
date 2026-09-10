import { env } from "../../config/env.js";
import { osrmRoute } from "./osrm.js";
import { nominatimGeocode, nominatimReverse } from "./nominatim.js";
import { GeoNotConfiguredError } from "./provider.js";
import type { GeoProvider, GeoPoint, GeocodeResult, RouteResult } from "./provider.js";

export * from "./provider.js";

class OsrmNominatimProvider implements GeoProvider {
  async geocode(query: string): Promise<GeocodeResult[]> {
    if (!env.GEOCODER_URL) throw new GeoNotConfiguredError("GEOCODER_URL is not configured.");
    return nominatimGeocode(env.GEOCODER_URL, query);
  }

  async reverseGeocode(point: GeoPoint): Promise<GeocodeResult> {
    if (!env.GEOCODER_URL) throw new GeoNotConfiguredError("GEOCODER_URL is not configured.");
    return nominatimReverse(env.GEOCODER_URL, point);
  }

  async route(from: GeoPoint, to: GeoPoint): Promise<RouteResult> {
    if (!env.ROUTING_ENGINE_URL) throw new GeoNotConfiguredError("ROUTING_ENGINE_URL is not configured.");
    return osrmRoute(env.ROUTING_ENGINE_URL, from, to);
  }
}

/** The one GeoProvider instance the rest of the app should import. */
export const geoProvider: GeoProvider = new OsrmNominatimProvider();
