import type { BibEntry, CitationHistoryEntry } from "../../types/bib";

export interface CitationFormatter {
  styleName: string;
  formatFootnote(
    entry: BibEntry,
    pinpoint: string,
    history: CitationHistoryEntry[],
    currentFootnoteNumber: number
  ): string;
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
