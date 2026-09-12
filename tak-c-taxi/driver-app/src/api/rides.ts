import { api } from "./client";

export interface Ride {
  id: string;
  state: string;
  pickupLabel: string;
  destLabel: string;
  plannedDistanceM: number;
  plannedDurationS: number;
  quotedFareCents: number;
}

export function getRide(id: string): Promise<Ride> {
  return api.get(`/rides/${id}`);
}

export function acceptRide(id: string): Promise<{ id: string; state: string }> {
  return api.post(`/rides/${id}/accept`);
}

export function declineRide(id: string): Promise<void> {
  return api.post(`/rides/${id}/decline`);
}

export function markArrived(id: string, point: { lat: number; lng: number }): Promise<{ id: string; state: string }> {
  return api.post(`/rides/${id}/arrived`, point);
}

export function startTrip(id: string, point: { lat: number; lng: number }): Promise<{ id: string; state: string }> {
  return api.post(`/rides/${id}/start`, point);
}

export function endTrip(
  id: string,
  point: { lat: number; lng: number },
): Promise<{ id: string; state: string; invoice: { totalCents: number; currency: string; distanceM: number; waitingS: number } }> {
  return api.post(`/rides/${id}/end`, point);
}

export function startWaiting(id: string, point: { lat: number; lng: number }): Promise<{ id: string; state: string }> {
  return api.post(`/rides/${id}/waiting/start`, point);
}

export function stopWaiting(id: string, point: { lat: number; lng: number }): Promise<{ id: string; state: string }> {
  return api.post(`/rides/${id}/waiting/stop`, point);
}

export function cancelRide(id: string, reason?: string): Promise<{ id: string; cancelledBy: string }> {
  return api.post(`/rides/${id}/cancel`, { reason });
}
