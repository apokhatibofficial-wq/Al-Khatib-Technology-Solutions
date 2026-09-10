-- Prisma's diff wants to drop Quote_pickup_gist/Quote_dest_gist here because
-- hand-added GIST indexes (see 20260910175334_init and 20260910181920) aren't
-- expressible in schema.prisma, so its diffing never sees them as "expected".
-- Deliberately NOT dropping them — keep this note on every future migration
-- that touches a table with a hand-added spatial index.

-- CreateTable
CREATE TABLE "DriverLiveLocation" (
    "driverId" TEXT NOT NULL,
    "point" geography(Point, 4326) NOT NULL,
    "accuracyM" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverLiveLocation_pkey" PRIMARY KEY ("driverId")
);

-- CreateTable
CREATE TABLE "RideStateEvent" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "fromState" "RideState",
    "toState" "RideState" NOT NULL,
    "point" geography(Point, 4326),
    "actorId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideStateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideStateEvent_rideId_occurredAt_idx" ON "RideStateEvent"("rideId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_actorId_endpoint_key_key" ON "IdempotencyKey"("actorId", "endpoint", "key");

-- AddForeignKey
ALTER TABLE "DriverLiveLocation" ADD CONSTRAINT "DriverLiveLocation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideStateEvent" ADD CONSTRAINT "RideStateEvent_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (GIST, spatial) — see 20260910175334_init for why.
CREATE INDEX "DriverLiveLocation_point_gist" ON "DriverLiveLocation" USING GIST ("point");
CREATE INDEX "RideStateEvent_point_gist" ON "RideStateEvent" USING GIST ("point");
