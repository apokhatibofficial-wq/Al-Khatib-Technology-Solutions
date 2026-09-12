import { getDriverLocation } from "./geo.js";
import type { GeoPoint } from "../geo/provider.js";

// §10's threat table, "تزييف الموقع" (location spoofing) row, names these
// controls explicitly: "فحص الدقة والطابع الزمني، رفض السرعات المستحيلة
// والقفزات... تسجيل الشذوذ للمراجعة البشرية". None of these numbers are
// specified by the doc — documented defaults, same as SEARCH_RADIUS_M etc.
// elsewhere. Full route-matching (مطابقة المسار) is NOT attempted here —
// the doc itself calls 100% spoofing prevention on a user-owned device an
// impossible promise; this is detection-and-reduction, exactly the honest
// scope the doc asks for, not the missing piece.
const MAX_ACCURACY_M = 200;
const MAX_PLAUSIBLE_SPEED_MPS = 55; // ~198 km/h — generous for a car, still catches a clear teleport/spoof.
const MAX_CLOCK_SKEW_S = 300;

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export interface PlausibilityResult {
  plausible: boolean;
  reason?: string;
}

export async function checkLocationPlausibility(
  driverId: string,
  point: GeoPoint,
  accuracyM: number,
  deviceTs: Date,
): Promise<PlausibilityResult> {
  const skewS = Math.abs((Date.now() - deviceTs.getTime()) / 1000);
  if (skewS > MAX_CLOCK_SKEW_S) {
    return { plausible: false, reason: `device clock skew of ${Math.round(skewS)}s exceeds ${MAX_CLOCK_SKEW_S}s` };
  }
  if (accuracyM > MAX_ACCURACY_M) {
    return { plausible: false, reason: `accuracy ${accuracyM}m worse than ${MAX_ACCURACY_M}m` };
  }

  const previous = await getDriverLocation(driverId);
  if (!previous) return { plausible: true }; // nothing to compare against yet — first fix of the session.

  const elapsedS = (deviceTs.getTime() - previous.updatedAt.getTime()) / 1000;
  if (elapsedS <= 0) return { plausible: true }; // out-of-order/duplicate delivery — not this check's job to sort ordering.

  const distanceM = haversineMeters(previous, point);
  const impliedSpeedMps = distanceM / elapsedS;
  if (impliedSpeedMps > MAX_PLAUSIBLE_SPEED_MPS) {
    return {
      plausible: false,
      reason: `implied speed ${impliedSpeedMps.toFixed(1)} m/s over ${elapsedS.toFixed(1)}s exceeds ${MAX_PLAUSIBLE_SPEED_MPS} m/s`,
    };
  }

  return { plausible: true };
}
