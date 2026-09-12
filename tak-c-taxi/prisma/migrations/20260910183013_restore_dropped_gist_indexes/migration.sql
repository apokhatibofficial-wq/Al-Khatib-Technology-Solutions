-- Corrective migration: 20260910180913_add_auth_sessions silently dropped
-- every hand-added GIST spatial index from 20260910175334_init, because
-- Prisma's diff engine has no way to know about indexes that aren't
-- expressible in schema.prisma (see that migration's own note, added after
-- this was caught). Re-creates exactly what was lost — same names, same
-- definitions — so ST_DWithin/ST_Distance queries against these columns
-- use an index again instead of a sequential scan.
--
-- Process fix going forward: every future migration.sql gets grepped for
-- "DROP INDEX" on a *_gist index before it's applied, not just when a
-- migration happens to also add a new geography column of its own.
CREATE INDEX "City_centroid_gist" ON "City" USING GIST ("centroid");
CREATE INDEX "City_boundary_gist" ON "City" USING GIST ("boundary");
CREATE INDEX "Ride_pickup_gist" ON "Ride" USING GIST ("pickup");
CREATE INDEX "Ride_dest_gist" ON "Ride" USING GIST ("dest");
CREATE INDEX "RideLocation_point_gist" ON "RideLocation" USING GIST ("point");
CREATE INDEX "WaitingEvent_startPoint_gist" ON "WaitingEvent" USING GIST ("startPoint");
CREATE INDEX "WaitingEvent_endPoint_gist" ON "WaitingEvent" USING GIST ("endPoint");
