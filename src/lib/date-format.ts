import type { Locale } from "../stores/settings-store";

/**
 * Format today's date for the cover page's "auto" mode.
 *
 * Academic covers conventionally use month + year ("May 2026"), so we omit
 * the day to keep the cover stable across small reopens (typing the same
 * paper across two days shouldn't change the printed date). Locale-aware so
 * Chinese cover pages render "2026年5月" instead.
 */
export function formatAutoDate(locale: Locale, now: Date = new Date()): string {
  if (locale === "zh-CN") {
    return `${now.getFullYear()}年${now.getMonth() + 1}月`;
  }
  const month = now.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${now.getFullYear()}`;
}
