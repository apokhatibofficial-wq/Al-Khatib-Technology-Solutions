import { Secret, TOTP } from "otpauth";

/** §10: MFA is mandatory for admin. Called once per AdminUser during provisioning (phase 7). */
export function generateAdminMfaSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function verifyAdminTotp(base32Secret: string, code: string): boolean {
  const totp = new TOTP({ secret: Secret.fromBase32(base32Secret), digits: 6, period: 30 });
  return totp.validate({ token: code, window: 1 }) !== null;
}
