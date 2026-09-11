import { useEffect, useRef } from "react";
import { MapLibreMap, Marker, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoPoint } from "../api/geo";

// Standard OSM raster tiles, not a self-hosted tile server — MAP_TILES_URL
// (see the backend's .env.example) is still reserved/unbuilt, same
// situation this project already solved for geocoding (public Nominatim)
// and initially for routing (public OSRM, since self-hosted): start on the
// free public service under its usage policy (attribution required, which
// the "© OpenStreetMap contributors" attributionControl below provides),
// move to a dedicated tile server once traffic justifies it.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

interface Props {
  center: GeoPoint;
  markers?: Array<{ point: GeoPoint; color?: string }>;
  onMove?: (center: GeoPoint) => void;
  className?: string;
}

export function MapView({ center, markers = [], onMove, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerObjsRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [center.lng, center.lat],
      zoom: 15,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    if (onMove) {
      map.on("moveend", () => {
        const c = map.getCenter();
        onMove({ lat: c.lat, lng: c.lng });
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markerObjsRef.current.forEach((m) => m.remove());
    markerObjsRef.current = markers.map(({ point, color }) =>
      new Marker({ color: color ?? "#1f1f1f" }).setLngLat([point.lng, point.lat]).addTo(mapRef.current!),
    );
  }, [markers]);

  return <div ref={containerRef} className={className} />;
}
