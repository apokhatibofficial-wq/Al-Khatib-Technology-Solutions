#!/bin/sh
# Runs once, on a fresh postgis/postgis container's first boot (standard
# docker-entrypoint-initdb.d convention — ignored on a reused volume).
#
# Belt-and-suspenders against a real bug this project already hit once
# (see tak-c-taxi/README.md's Prerequisites section, phase 9): on at least
# one PostGIS packaging (Debian/Ubuntu's apt build), `CREATE EXTENSION
# postgis` alone leaves `spatial_ref_sys` empty — the standard EPSG SRID
# rows (including 4326, which every geography column in this schema uses)
# ship as a separate seed script, not part of the extension install itself.
# Whether the official postgis/postgis image avoids that or not, this
# check-and-load is idempotent and costs nothing when the table is already
# populated, so there's no need to trust either behavior blindly.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
  CREATE EXTENSION IF NOT EXISTS postgis;
EOSQL

ROW_COUNT=$(psql -tA --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "SELECT count(*) FROM spatial_ref_sys;")

if [ "$ROW_COUNT" = "0" ]; then
  echo "postgis-init: spatial_ref_sys is empty after CREATE EXTENSION postgis — loading the standard SRID seed script."
  SEED_FILE=$(find /usr/share/postgresql -name spatial_ref_sys.sql 2>/dev/null | head -n1)
  if [ -n "$SEED_FILE" ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$SEED_FILE"
    echo "postgis-init: loaded $SEED_FILE."
  else
    echo "postgis-init WARNING: CREATE EXTENSION postgis left spatial_ref_sys empty and no spatial_ref_sys.sql was found on this image to fix it automatically — every ST_*(geography) call will fail with 'Cannot find SRID' until this is loaded manually." >&2
  fi
else
  echo "postgis-init: spatial_ref_sys already has $ROW_COUNT rows — nothing to do."
fi
