import type { CitationFormatter } from "./formatter";
import { oscolaFormatter } from "./oscola";
import { apaFormatter } from "./apa";
import { harvardFormatter } from "./harvard";
import { chicagoFormatter } from "./chicago";
import { ieeeFormatter } from "./ieee";
import { plainFormatter } from "./plain";

const formatters: Record<string, CitationFormatter> = {
  oscola: oscolaFormatter,
  apa: apaFormatter,
  harvard: harvardFormatter,
  chicago: chicagoFormatter,
  ieee: ieeeFormatter,
  plain: plainFormatter,
};

const aliases: Record<string, string> = {
  apalike: "apa", apacite: "apa",
  agsm: "harvard", dcu: "harvard",
  chicagoa: "chicago",
  ieeetr: "ieee", ieeetran: "ieee",
  plainnat: "plain", unsrt: "plain", abbrv: "plain", alpha: "plain",
};

export function getFormatter(style: string): CitationFormatter {
  const key = style.toLowerCase().trim();
  if (formatters[key]) return formatters[key];
  const alias = aliases[key];
  if (alias && formatters[alias]) return formatters[alias];
  return formatters.oscola; // default fallback
}

export function getStyleNames(): string[] {
  return Object.keys(formatters).sort();
}

/**
 * Short, human-readable description of a citation style — surfaced under the
 * style name in the references-panel style card. Kept here next to the
 * formatter registry so the two stay in sync.
 */
const STYLE_DESCRIPTIONS: Record<string, string> = {
  oscola: "Footnotes · UK law",
  harvard: "Author–date · UK academic",
  apa: "Author–date · 7th edn",
  chicago: "Author–date · humanities",
  ieee: "Numeric · engineering",
  plain: "Numeric · BibTeX default",
};

export function getStyleDescription(style: string): string {
  const key = style.toLowerCase().trim();
  if (STYLE_DESCRIPTIONS[key]) return STYLE_DESCRIPTIONS[key];
  const alias = aliases[key];
  if (alias && STYLE_DESCRIPTIONS[alias]) return STYLE_DESCRIPTIONS[alias];
  return "";
}

/**
 * Styles surfaced first in pickers. LexTyp targets UK law / academic writers,
 * so OSCOLA and Harvard sit above the rest with a divider in the UI.
 */
export const PRIMARY_STYLES: readonly string[] = ["oscola", "harvard"] as const;

/**
 * Style names ordered for UI pickers: primary styles first, then the rest
 * alphabetically. Consumers render a divider between the two groups using
 * `PRIMARY_STYLES.length` as the boundary.
 */
export function getOrderedStyleNames(): string[] {
  const all = getStyleNames();
  const primary = PRIMARY_STYLES.filter((s) => all.includes(s));
  const rest = all.filter((s) => !PRIMARY_STYLES.includes(s));
  return [...primary, ...rest];
}
