import { geoProvider } from "../geo/index.js";
import type { GeoPoint } from "../geo/provider.js";

/**
 * §6: "يُحسب على السيرفر من آخر موقع موثوق للسائق + المسار الحقيقي، ويُعاد
 * حسابه عند كل تحديث موقع" — a real route call, every time, never a client-
 * side guess. Returns null (never a fabricated number) if the route can't
 * be computed right now — §6 explicitly wants "تحديث الوصول متوقف مؤقتًا"
 * (ETA update paused) shown to the user instead of a fake counter.
 */
export async function computeEtaSeconds(from: GeoPoint, to: GeoPoint): Promise<number | null> {
  try {
    const route = await geoProvider.route(from, to);
    return route.durationS;
  } catch {
    return null;
  }
}
