// Creates (or re-keys the MFA of) an AdminUser. Deliberately a script, not
// an HTTP endpoint: §10 makes MFA mandatory for admin, and the *first*
// admin account has to come from somewhere before any endpoint could
// itself be protected by admin auth — an open "create an admin" route
// would be a standing hole, not a bootstrap step. Run out-of-band, by
// whoever already has shell access to the deployment.
//
// Usage: npx tsx scripts/create-admin.ts <email> <role>
//   role: SUPER_ADMIN | OPS | SUPPORT | FINANCE | READONLY
import { TOTP, Secret } from "otpauth";
import { prisma } from "../src/db/client.js";
import type { AdminRole } from "../src/generated/prisma/enums.js";

const VALID_ROLES: AdminRole[] = ["SUPER_ADMIN", "OPS", "SUPPORT", "FINANCE", "READONLY"];

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role || !VALID_ROLES.includes(role as AdminRole)) {
    console.error(`Usage: npx tsx scripts/create-admin.ts <email> <${VALID_ROLES.join("|")}>`);
    process.exitCode = 1;
    return;
  }

  const mfaSecret = new Secret({ size: 20 }).base32;
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { role: role as AdminRole, mfaSecret },
    create: { email, role: role as AdminRole, mfaSecret },
  });

  const totp = new TOTP({ issuer: "Tak-C.taxi Admin", label: email, secret: Secret.fromBase32(mfaSecret) });

  console.log(`Admin ${admin.id} (${email}, ${admin.role}) is ready.`);
  console.log(`\nMFA setup — add this to an authenticator app (Google Authenticator, 1Password, etc.):`);
  console.log(`  Secret (manual entry): ${mfaSecret}`);
  console.log(`  Provisioning URI (scan as QR):\n  ${totp.toString()}`);
  console.log(
    `\nLogin flow: POST /auth/google with this email → { mfaRequired: true, ticket } → POST /auth/admin/mfa/verify with { ticket, code } from the authenticator app.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
