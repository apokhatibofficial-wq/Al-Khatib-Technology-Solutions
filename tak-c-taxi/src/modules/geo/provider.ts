// GeoProvider abstraction (§2): "طبقة تجريد GeoProvider تسمح بتشغيل Google
// لاحقًا بتغيير إعداد واحد إذا توفّرت حساب فوترة صالح" — the doc explicitly
// wants routing/geocoding swappable behind one interface. Everything else in
// this module talks to *this* interface, never directly to OSRM/Nominatim.

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

export interface RouteResult {
  distanceM: number;
  durationS: number;
  /** Encoded polyline (Google/OSRM polyline5 format). */
  polyline: string;
}

export interface GeoProvider {
  geocode(query: string): Promise<GeocodeResult[]>;
  reverseGeocode(point: GeoPoint): Promise<GeocodeResult>;
  route(from: GeoPoint, to: GeoPoint): Promise<RouteResult>;
}

export class GeoNotConfiguredError extends Error {}
export class GeoProviderError extends Error {}
