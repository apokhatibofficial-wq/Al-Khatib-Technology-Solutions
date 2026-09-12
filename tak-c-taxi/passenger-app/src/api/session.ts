import { api } from "./client";

export function refresh(): Promise<{ accessToken: string }> {
  return api.post("/auth/refresh");
}
