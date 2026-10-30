import type { DateRange } from "@/types";
import { DATE_PRESETS } from "@/stores/ui";

export function rangeLabel(r: DateRange): string {
  if (r.preset) return DATE_PRESETS.find((p) => p.value === r.preset)?.label ?? r.preset;
  return r.to ? `${r.from} → ${r.to}` : `${r.from} → today`;
}

export function pickInterval(r: DateRange): "hour" | "day" | "week" {
  if (r.preset === "today" || r.preset === "yesterday") return "hour";
  if (r.preset === "last_90_days") return "day";
  if (r.from && r.to) {
    const days = (Date.parse(r.to) - Date.parse(r.from)) / 86400000 + 1;
    if (days <= 2) return "hour";
    if (days > 120) return "week";
  }
  return "day";
}

export const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];
export const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
