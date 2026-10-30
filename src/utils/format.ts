export const nf = new Intl.NumberFormat("en-US");
export const fmtNum = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n) ? "–" : n.toLocaleString("en-US", { maximumFractionDigits: digits });
export const fmtCompact = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "–"
    : Math.abs(n) >= 10_000
      ? Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)
      : fmtNum(n, Math.abs(n) < 100 && !Number.isInteger(n) ? 1 : 0);
export const fmtPct = (r: number | null | undefined, digits = 1) =>
  r === null || r === undefined ? "–" : `${(r * 100).toFixed(digits)}%`;

export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "–";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

/** Percentage change of `cur` vs `prev`; null when there is no baseline. */
export function pctChange(cur: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined || prev === 0) return null;
  return (cur - prev) / prev;
}

export function fmtDateTime(iso: string, tz?: string | null): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tz || undefined,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
export function fmtDate(iso: string, tz?: string | null): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: tz || undefined,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
export function fmtTime(iso: string, tz?: string | null): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: tz || undefined,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
export function relativeTime(iso: string, now = Date.now()): string {
  const d = (now - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

/** Chart bucket label (as returned by the API, already in the query timezone) -> short axis label. */
export function bucketLabel(label: string, interval?: string | null): string {
  if (interval === "hour") return label.slice(5).replace("T", " ");
  if (interval === "month") return label.slice(0, 7);
  return label.slice(5);
}
