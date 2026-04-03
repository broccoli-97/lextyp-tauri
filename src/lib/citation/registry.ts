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
