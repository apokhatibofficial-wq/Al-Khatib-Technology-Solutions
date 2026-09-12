-- Switches the login identity from phone+SMS to email (user decision,
-- phase 9 follow-up — a Syria-reachable SMS gateway is a real operational
-- blocker an email provider isn't). Backfills existing dev/test rows
-- (synthetic fixtures from this project's own phase-by-phase verification,
-- not real users — confirmed against the data before writing this) with a
-- clearly-synthetic placeholder derived from their old phone value, rather
-- than dropping rows or fabricating fake-looking real addresses: the old
-- phone numbers were already unique, so `<phone>@migrated.invalid` stays
-- unique too, satisfying the new constraint without any data loss.

-- OtpRequest
ALTER TABLE "OtpRequest" ADD COLUMN "email" TEXT;
UPDATE "OtpRequest" SET "email" = "phone" || '@migrated.invalid';
ALTER TABLE "OtpRequest" ALTER COLUMN "email" SET NOT NULL;
-- DROP COLUMN implicitly drops OtpRequest_phone_createdAt_idx with it — an
-- explicit DROP INDEX for it here would (and, hit for real once, did) fail
-- with "index does not exist".
ALTER TABLE "OtpRequest" DROP COLUMN "phone";

CREATE INDEX "OtpRequest_email_createdAt_idx" ON "OtpRequest"("email", "createdAt");

-- User
ALTER TABLE "User" ADD COLUMN "email" TEXT;
UPDATE "User" SET "email" = "phone" || '@migrated.invalid';
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
-- Same as above: implicitly drops User_phone_key.
ALTER TABLE "User" DROP COLUMN "phone";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
