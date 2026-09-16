import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* Visit dates are stored as free-form strings (seed uses ISO, kiosk writes
   "24 Apr 2026") — normalize parseable ones so lists read uniformly. */
export function formatVisitDate(raw?: string, fallback = "—"): string {
  if (!raw) return fallback;
  const t = Date.parse(raw);
  if (isNaN(t)) return raw;
  return new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
