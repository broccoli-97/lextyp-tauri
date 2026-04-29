import type { BibEntry, CitationHistoryEntry } from "../../types/bib";

/**
 * How a citation style places its references.
 *
 * - `footnote` — the citation marker becomes a `#footnote[…]` containing the
 *   full reference at the bottom of the page. Used by OSCOLA and Chicago
 *   (notes-bibliography). The bibliography section at the end is optional but
 *   we still emit it for cited entries.
 * - `in-text` — the citation marker is spliced directly into the running text
 *   (e.g. `(Smith, 2020)` for author-date or `[1]` for numeric styles). The
 *   full reference appears only in the bibliography at the end.
 */
export type CitationKind = "footnote" | "in-text";

export interface CitationFormatter {
  styleName: string;
  kind: CitationKind;
  /**
   * Render the in-text citation marker. For footnote styles this becomes the
   * footnote body (the serializer wraps it in `#footnote[…]`); for in-text
   * styles it is spliced into the text verbatim.
   *
   * `index` is the 1-based footnote number for footnote styles, or the
   * 1-based bibliography index for numeric in-text styles. Author-date styles
   * ignore it.
   */
  formatCitation(
    entry: BibEntry,
    pinpoint: string,
    history: CitationHistoryEntry[],
    index: number
  ): string;
  /**
   * Render a single bibliography entry. `index` is the 1-based position in
   * the bibliography (used by numbered styles like IEEE/plain that prefix
   * with `[N]`); other styles ignore it.
   */
  formatBibliography(entry: BibEntry, index: number): string;
}

export function shortAuthor(author: string): string {
  if (author.includes(", ")) return author.substring(0, author.indexOf(", "));
  const lastSpace = author.lastIndexOf(" ");
  if (lastSpace > 0) return author.substring(lastSpace + 1);
  return author;
}

export function italicize(text: string): string {
  return text ? `_${text}_` : text;
}

export function field(entry: BibEntry, name: string): string {
  return entry.fields[name] || "";
}
