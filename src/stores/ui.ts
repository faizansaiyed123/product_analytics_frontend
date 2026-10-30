import { create } from "zustand";
import type { DateRange } from "@/types";

export const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_14_days", label: "Last 14 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
] as const;

type Theme = "light" | "dark";
interface UIState {
  theme: Theme;
  toggleTheme: () => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  timezone: string | null;
  setTimezone: (tz: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
}

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
}

const initialTheme: Theme =
  (read("pa-theme") as Theme) ||
  (typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const initialRange: DateRange = (() => {
  try {
    return JSON.parse(read("pa-range") ?? "") as DateRange;
  } catch {
    return { preset: "last_7_days" };
  }
})();

export const useUI = create<UIState>((set, get) => ({
  theme: initialTheme,
  toggleTheme: () => {
    const t: Theme = get().theme === "dark" ? "light" : "dark";
    write("pa-theme", t);
    applyTheme(t);
    set({ theme: t });
  },
  projectId: read("pa-project"),
  setProjectId: (id) => {
    write("pa-project", id);
    set({ projectId: id });
  },
  dateRange: initialRange,
  setDateRange: (r) => {
    write("pa-range", JSON.stringify(r));
    set({ dateRange: r });
  },
  timezone: read("pa-tz"),
  setTimezone: (tz) => {
    write("pa-tz", tz);
    set({ timezone: tz });
  },
  sidebarOpen: false,
  setSidebarOpen: (b) => set({ sidebarOpen: b }),
}));
