import { parse as parseBib } from "@retorquere/bibtex-parser";
import type { BibEntry } from "../types/bib";

/**
 * Parse a `.bib` file into `BibEntry[]`.
 *
 * This wraps `@retorquere/bibtex-parser`, the same engine that powers Better
 * BibTeX for Zotero. It handles the things the old hand-rolled regex parser
 * silently mangled: `@string` substitution, `crossref` inheritance, LaTeX
 * macros (`\textit{…}`, `\&`, …), diacritics (`{\"o}` → `ö`), and — most
 * importantly for law/humanities users — brace-protection (`{NATO}`, `{D}NA`)
 * that protects capitalisation from title-case folding.
 *
 * The library's structured output (creator lists as `{firstName, lastName}`
 * arrays, etc.) is flattened back to the `Record<string, string>` shape our
 * citation formatters consume, so call-sites do not have to change.
 */
export function parseBibtex(content: string): BibEntry[] {
  if (!content || !content.trim()) return [];
  let parsed;
  try {
    parsed = parseBib(content, {
      // Unknown LaTeX macros become their literal source instead of throwing —
      // for an editor consuming Zotero/Mendeley exports, partial recovery
      // beats refusing to load a 200-entry library because of one stray macro.
      unsupported: (_node, tex) => tex,
      // The library auto-applies sentence-casing to titles ("The Concept of
      // Law" → "The concept of law"). Disable it: legal/humanities styles
      // (OSCOLA, Chicago, MLA) expect Title Case; users typed the title in
      // the case they want. Brace-protection and diacritic conversion still
      // run — only the heuristic title-folding is off.
      sentenceCase: false,
    });
  } catch {
    return [];
  }

  const out: BibEntry[] = [];
  for (const entry of parsed.entries) {
    out.push(adaptEntry(entry));
  }
  return out;
}

function adaptEntry(entry: {
  type: string;
  key: string;
  fields: Record<string, unknown>;
}): BibEntry {
  const fields: Record<string, string> = {};
  for (const [name, value] of Object.entries(entry.fields ?? {})) {
    const flat = stringifyField(value);
    if (flat) fields[name] = flat;
  }
  return {
    key: entry.key ?? "",
    type: (entry.type ?? "misc").toLowerCase(),
    fields,
  };
}

function stringifyField(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return cleanMarkup(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const looksLikeCreators = value.some(
      (v) => v && typeof v === "object" && ("lastName" in v || "firstName" in v || "name" in v)
    );
    if (looksLikeCreators) {
      return value.map(stringifyCreator).filter((s) => s).join(" and ");
    }
    // literallist (publishers, locations, …) — semicolon-joined to match the
    // convention BibTeX users see when they re-flatten a multi-value field.
    return value.map((v) => stringifyField(v)).filter((s) => s).join("; ");
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("lastName" in v || "firstName" in v || "name" in v) {
      return stringifyCreator(v);
    }
    return cleanMarkup(String(value));
  }
  return String(value);
}

/**
 * Render one parsed creator object back to a BibTeX-style "First Last" string.
 *
 * Two design decisions worth knowing:
 *   • We emit "First Last", not "Last, First". The library always normalises
 *     to {lastName, firstName} internally, but legal/humanities styles
 *     (OSCOLA, Chicago notes-bibliography) expect natural author order in
 *     citations; the formatters call `shortAuthor()` to derive surnames when
 *     they need them. Keeping the original BibTeX-typed order also lets case
 *     names like "Donoghue v Stevenson" survive a parse that splits on `v`.
 *   • If `lastName` contains a space and no `firstName` is present, that's
 *     usually a sign the parser guessed wrong (case names, organisations,
 *     non-Western single-component names). Fall through to the `.name`
 *     verbatim field when the structured guess is suspicious.
 */
function stringifyCreator(c: unknown): string {
  if (!c || typeof c !== "object") return "";
  const obj = c as Record<string, unknown>;
  if (typeof obj.name === "string" && obj.name) return cleanMarkup(obj.name);

  const last = strOrEmpty(obj.lastName);
  const first = strOrEmpty(obj.firstName);
  const prefix = strOrEmpty(obj.prefix);
  const suffix = strOrEmpty(obj.suffix);

  if (!last && !first) return "";

  const fullLast = prefix ? `${prefix} ${last}` : last;
  const body = first ? `${first} ${fullLast}` : fullLast;
  return suffix ? `${body}, ${suffix}` : body;
}

function strOrEmpty(v: unknown): string {
  return typeof v === "string" ? cleanMarkup(v) : "";
}

/**
 * Strip the parser's inline-markup control characters (`\x0E…\x0F` wraps a
 * tag like `b`, `i`, `sc`, `nc`). The wrapped text is preserved — only the
 * tags are removed — so brace-protected runs survive in their original form
 * but the wire markup itself doesn't leak into the rendered citation.
 */
function cleanMarkup(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x0E\/?[a-z]+\x0F/gi, "").trim();
}
