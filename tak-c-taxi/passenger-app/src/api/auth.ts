import { api } from "./client";

export type Gender = "male" | "female";

export interface Me {
  actorType: "user";
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  gender: Gender | null;
  photoFileId: string | null;
  status: string;
  driver: { status: string; isOnline: boolean } | null;
}

export interface RegistrationFields {
  fullName: string;
  phone: string;
  gender: Gender;
}

export function requestOtp(email: string): Promise<void> {
  return api.post("/auth/otp/request", { email });
}

export function verifyOtp(
  email: string,
  code: string,
  fields: RegistrationFields,
): Promise<{ accessToken: string; user: { id: string; status: string } }> {
  return api.post("/auth/otp/verify", { email, code, ...fields });
}

export function me(): Promise<Me> {
  return api.get("/me");
}

export function updateMe(
  patch: Partial<RegistrationFields> & { photoFileId?: string | null },
): Promise<Me> {
  return api.patch("/me", patch);
}

export function logout(): Promise<void> {
  return api.post("/auth/logout");
}
