/*
  Warnings:

  - You are about to drop the `DriverLiveLocation` table. Its data is
    replaced by Redis's native geospatial commands (GEOADD/GEOSEARCH) —
    see src/modules/realtime/geo.ts and the phase 5 README notes. Any rows
    in it were live driver positions, inherently stale/re-derivable, not
    durable data — nothing of lasting value is lost.

  Per the standing process note (see 20260910183013_restore_dropped_gist_
  indexes): Prisma's diff wants to DROP INDEX on every hand-added GIST
  index again here (City, Quote, Ride, RideLocation, RideStateEvent,
  WaitingEvent) because it still can't see indexes schema.prisma has no
  syntax for. Every one of those DROP INDEX statements was removed from
  this migration by hand. Only DriverLiveLocation's own index goes with
  it, implicitly, via DROP TABLE below — that one's correct.
*/
-- DropForeignKey
ALTER TABLE "DriverLiveLocation" DROP CONSTRAINT "DriverLiveLocation_driverId_fkey";

-- DropTable
DROP TABLE "DriverLiveLocation";
