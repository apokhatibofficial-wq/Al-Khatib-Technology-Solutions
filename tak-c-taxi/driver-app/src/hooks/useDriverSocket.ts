import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "../api/client";

export interface RideOfferEvent {
  type: "ride_offer";
  rideId: string;
  pickup: { lat: number; lng: number };
  pickupLabel: string;
  destLabel: string;
  distanceM: number;
  durationS: number;
  fareCents: number;
  expiresInMs: number;
}

const WS_URL = import.meta.env.VITE_WS_URL as string;
const RECONNECT_DELAY_MS = 3000;

// realtime/websocket.ts's protocol: connect with ?token=, send
// {type:"subscribe", room:"driver:<id>"} once open, then raw published
// JSON arrives un-wrapped — only assignment.ts's offer broadcast carries a
// "type" field, so that's what distinguishes an offer from this driver's
// own location echoing back through the same room (broadcast.ts).
export function useDriverSocket(driverId: string | null): {
  offer: RideOfferEvent | null;
  clearOffer: () => void;
  connected: boolean;
} {
  const [offer, setOffer] = useState<RideOfferEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const token = getAccessToken();
      if (!token || cancelled) return;

      const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "subscribe", room: `driver:${driverId}` }));
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ride_offer") setOffer(msg as RideOfferEvent);
        } catch {
          // Non-JSON or unrelated frame — ignore.
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, [driverId]);

  return { offer, clearOffer: () => setOffer(null), connected };
}
