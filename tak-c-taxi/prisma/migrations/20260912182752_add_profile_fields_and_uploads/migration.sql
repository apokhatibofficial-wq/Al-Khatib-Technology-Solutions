-- Adds a real, working image store for profile/vehicle photos — bytes live
-- directly in Postgres, served through GET /uploads/:id. Not S3: same
-- "start simple, move to dedicated storage later if it ever needs to scale
-- further" progression already used for geocoding/routing/tiles elsewhere
-- in this project (see README's "Deployment" section) — a real
-- implementation for launch scale, not a stub.
--
-- User.phone is re-added as a plain contact field collected on the
-- registration form, NOT a login identity — login stays email+OTP (see
-- 20260911152307_switch_login_identity_to_email). A different column
-- serving a different purpose, not a reversal of that decision.
--
-- Vehicle.photoKey was already unused (documented for a self-hosted S3 that
-- was never built; nothing read or wrote it) — replaced outright with the
-- same real mechanism User.photo now uses, rather than leaving two
-- different half-built approaches to the same problem.

CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "photoFileId" TEXT;
CREATE UNIQUE INDEX "User_photoFileId_key" ON "User"("photoFileId");
ALTER TABLE "User" ADD CONSTRAINT "User_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Vehicle" DROP COLUMN "photoKey";
ALTER TABLE "Vehicle" ADD COLUMN "photoFileId" TEXT;
CREATE UNIQUE INDEX "Vehicle_photoFileId_key" ON "Vehicle"("photoFileId");
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
