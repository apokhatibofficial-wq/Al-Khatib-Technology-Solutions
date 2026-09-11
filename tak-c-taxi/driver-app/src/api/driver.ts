import { api, ApiError } from "./client";
import type { GeoPoint } from "./geo";

export type DriverStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface DriverMe {
  id: string;
  status: DriverStatus;
  isOnline: boolean;
  ratingAvg: number;
  ratingCount: number;
  vehicle: { type: string; model: string; color: string; plate: string } | null;
}

export function applyToDrive(input: {
  age: number;
  vehicle: { type: string; model: string; color: string; plate: string };
}): Promise<{ id: string; status: DriverStatus }> {
  return api.post("/driver/apply", input);
}

export function driverMe(): Promise<DriverMe> {
  return api.get("/driver/me");
}

export function setOnline(online: boolean): Promise<{ online: boolean }> {
  return api.post("/driver/online", { online });
}

export function sendLocation(points: Array<GeoPoint & { accuracyM: number; deviceTs: string }>): Promise<void> {
  return api.post("/driver/location", { points });
}

export function currentRide(): Promise<{ id: string; state: string } | null> {
  return api.get<{ id: string; state: string }>("/driver/current-ride").catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
}
