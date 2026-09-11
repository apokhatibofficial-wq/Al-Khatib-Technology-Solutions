import { api } from "./client";

export interface Me {
  actorType: "user";
  id: string;
  fullName: string | null;
  email: string;
  status: string;
  driver: { status: string; isOnline: boolean } | null;
}

export function requestOtp(email: string): Promise<void> {
  return api.post("/auth/otp/request", { email });
}

export function verifyOtp(
  email: string,
  code: string,
): Promise<{ accessToken: string; user: { id: string; status: string } }> {
  return api.post("/auth/otp/verify", { email, code });
}

export function me(): Promise<Me> {
  return api.get("/me");
}

export function logout(): Promise<void> {
  return api.post("/auth/logout");
}
