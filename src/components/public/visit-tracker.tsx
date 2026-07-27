"use client";

import { useEffect, useRef } from "react";
import { recordVisitAction } from "@/lib/actions/visits";

export function VisitTracker({ slug, source }: { slug: string; source: "LINK" | "QR" }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    recordVisitAction(slug, source);
    // Fires once per real page view (mount), deliberately excluding
    // Next.js Link prefetches which only render on the server and never
    // mount this client component.
  }, [slug, source]);

  return null;
}
