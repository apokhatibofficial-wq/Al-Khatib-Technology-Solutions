const DAY_MS = 24 * 60 * 60 * 1000;

export function cycleEndDate(cycleStart: Date, cycleDays: number): Date {
  return new Date(cycleStart.getTime() + cycleDays * DAY_MS);
}

export function daysRemainingInCycle(cycleStart: Date, cycleDays: number): number {
  const end = cycleEndDate(cycleStart, cycleDays);
  return Math.ceil((end.getTime() - Date.now()) / DAY_MS);
}

export function isCycleExpired(cycleStart: Date, cycleDays: number): boolean {
  return cycleEndDate(cycleStart, cycleDays).getTime() < Date.now();
}

export const PAYMENT_STATUS_LABELS: Record<"PAID" | "UNPAID" | "LATE", string> = {
  PAID: "مدفوع",
  UNPAID: "غير مدفوع",
  LATE: "متأخر",
};

export const PAYMENT_STATUS_COLORS: Record<"PAID" | "UNPAID" | "LATE", string> = {
  PAID: "#1a9d5c",
  UNPAID: "#c0392b",
  LATE: "#d97706",
};
