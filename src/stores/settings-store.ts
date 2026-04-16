import { create } from "zustand";

export type Theme = "light" | "dark";
export type Locale = "en" | "zh-CN";

interface SettingsState {
  theme: Theme;
  locale: Locale;
  autoSnapshot: boolean;
  autoSnapshotInterval: number;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setAutoSnapshot: (on: boolean) => void;
  setAutoSnapshotInterval: (n: number) => void;
}

const THEME_KEY = "lextyp_theme";
const LOCALE_KEY = "lextyp_locale";
const AUTO_SNAP_KEY = "lextyp_auto_snapshot";
const AUTO_SNAP_INTERVAL_KEY = "lextyp_auto_snapshot_interval";

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "light";
}

function getInitialLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === "en" || saved === "zh-CN") return saved;
  // Auto-detect from browser
  const lang = navigator.language;
  if (lang.startsWith("zh")) return "zh-CN";
  return "en";
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: getInitialTheme(),
  locale: getInitialLocale(),
  autoSnapshot: localStorage.getItem(AUTO_SNAP_KEY) === "true",
  autoSnapshotInterval: parseInt(localStorage.getItem(AUTO_SNAP_INTERVAL_KEY) || "10", 10),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  setLocale: (locale) => {
    localStorage.setItem(LOCALE_KEY, locale);
    set({ locale });
  },
  setAutoSnapshot: (on) => {
    localStorage.setItem(AUTO_SNAP_KEY, String(on));
    set({ autoSnapshot: on });
  },
  setAutoSnapshotInterval: (n) => {
    localStorage.setItem(AUTO_SNAP_INTERVAL_KEY, String(n));
    set({ autoSnapshotInterval: n });
  },
}));
