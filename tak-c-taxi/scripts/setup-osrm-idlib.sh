#!/bin/bash
# Fetches real OpenStreetMap data for Idlib city, Dana, and Sarmada
# (the areas this project's real-world verification actually used — see
# README.md's "OSRM verified with real Idlib/Dana/Sarmada data" section)
# and runs it through OSRM's real extract/partition/customize pipeline.
#
# Geofabrik (the usual OSM country-extract source) was unreachable from the
# sandbox this was developed in — blocked at the network/egress level, not
# a code problem. This uses the official OpenStreetMap API's direct map
# export instead (api.openstreetmap.org/api/0.6/map), which works but caps
# each request at 50,000 nodes — too small for a single bounding box
# covering all three areas at once (this part of Idlib is densely mapped:
# refugee/IDP camps near Sarmada and Bab al-Hawa are mapped in detail).
# So this fetches several smaller boxes and merges them with osmium.
#
# For an actual production deployment, running OSRM's own Docker image
# (`docker run osrm/osrm-backend`) is simpler than this script's from-
# source build below — building from source here was specifically a
# workaround for not having a working Docker daemon in that sandbox, not
# a recommendation. Only the *data-fetching* steps below are relevant
# regardless of how you run osrm-extract/partition/customize/routed.
#
# Usage: ./setup-osrm-idlib.sh [output-dir]
set -euo pipefail

OUT_DIR="${1:-./osrm-data}"
mkdir -p "$OUT_DIR"
cd "$OUT_DIR"

fetch_bbox() {
  local name="$1" bbox="$2"
  echo "Fetching $name ($bbox)..."
  curl -sS --max-time 60 -o "$name.osm" \
    "https://api.openstreetmap.org/api/0.6/map?bbox=$bbox"
  if ! head -c 20 "$name.osm" | grep -q '<?xml'; then
    echo "ERROR: fetching $name failed (bbox may exceed the 50k node cap — try a smaller box):" >&2
    cat "$name.osm" >&2
    exit 1
  fi
}

# Central Idlib city.
fetch_bbox idlib "36.62,35.92,36.65,35.95"
# Dana (الدانا) — real coordinates from Nominatim (nominatim.openstreetmap.org),
# not estimated: 36.2135713,36.7704347 (lat,lon).
fetch_bbox dana "36.755,36.20,36.785,36.225"
# Sarmada (سرمدا), near Bab al-Hawa — real coordinates similarly geocoded:
# 36.2014255,36.7119201 (lat,lon).
fetch_bbox sarmada "36.70,36.19,36.73,36.215"
# The connecting road (M45) between Dana and Sarmada — without this, the
# two towns' road networks are disconnected components and OSRM reports
# "Impossible route between points" for any Dana<->Sarmada trip (this
# happened for real during verification; ports fixed by adding this box).
fetch_bbox gap "36.728,36.195,36.758,36.218"

echo "Merging..."
osmium merge idlib.osm dana.osm sarmada.osm gap.osm -o combined.osm.pbf --overwrite

echo "Running OSRM pipeline (requires osrm-extract/partition/customize on PATH)..."
# Set OSRM_CAR_PROFILE to your car.lua's real path. If running OSRM's own
# Docker image (the recommended way — see this file's header comment),
# that image ships it at /opt/car.lua.
osrm-extract combined.osm.pbf -p "${OSRM_CAR_PROFILE:?Set OSRM_CAR_PROFILE to car.lua's path, e.g. /opt/car.lua in OSRM's own Docker image}"
osrm-partition combined.osrm
osrm-customize combined.osrm

echo "Done. Run: osrm-routed --algorithm mld $OUT_DIR/combined.osrm"
echo "Then point ROUTING_ENGINE_URL at that server (default port 5000)."
