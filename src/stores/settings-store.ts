import { create } from "zustand";

export type Theme = "light" | "dark";
export type Locale = "en" | "zh-CN";

interface SettingsState {
  theme: Theme;
  locale: Locale;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
}

const THEME_KEY = "lextyp_theme";
const LOCALE_KEY = "lextyp_locale";

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
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  setLocale: (locale) => {
    localStorage.setItem(LOCALE_KEY, locale);
    set({ locale });
  },
}));
