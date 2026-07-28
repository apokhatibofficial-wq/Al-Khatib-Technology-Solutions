-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN     "splashDurationSeconds" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "splashEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "splashImageUrl" TEXT;
