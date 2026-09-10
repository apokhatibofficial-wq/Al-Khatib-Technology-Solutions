-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "pickup" geography(Point, 4326) NOT NULL,
    "dest" geography(Point, 4326) NOT NULL,
    "pickupLabel" TEXT NOT NULL,
    "destLabel" TEXT NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "durationS" INTEGER NOT NULL,
    "routePolyline" TEXT NOT NULL,
    "fareCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "pricingVersionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quote_expiresAt_idx" ON "Quote"("expiresAt");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_pricingVersionId_fkey" FOREIGN KEY ("pricingVersionId") REFERENCES "PricingVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (GIST, spatial) — see the migration in 20260910175334_init for why.
CREATE INDEX "Quote_pickup_gist" ON "Quote" USING GIST ("pickup");
CREATE INDEX "Quote_dest_gist" ON "Quote" USING GIST ("dest");
