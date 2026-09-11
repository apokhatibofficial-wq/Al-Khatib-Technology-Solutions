import { useEffect, useState } from "react";
import type { GeoPoint } from "../api/geo";

// Idlib's real centroid (matches scripts/dev-seed.ts's launch-city seed) —
// only a fallback while a real GPS fix is pending or denied, never used to
// silently stand in for it in anything that affects a fare.
const IDLIB_FALLBACK: GeoPoint = { lat: 35.9306, lng: 36.6339 };

export function useGeolocation(): { position: GeoPoint; isReal: boolean } {
  const [position, setPosition] = useState<GeoPoint>(IDLIB_FALLBACK);
  const [isReal, setIsReal] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsReal(true);
      },
      () => setIsReal(false),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, isReal };
}
