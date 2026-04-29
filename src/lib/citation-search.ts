import type { BibEntry } from "../types/bib";
import type { CitationFormatter } from "./citation/formatter";

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function matchesBibEntry(entry: BibEntry, query: string) {
  const q = normalize(query);
  if (!q) return true;

  const haystacks = [
    entry.key,
    entry.type,
    entry.fields.title || "",
    entry.fields.author || "",
    entry.fields.year || "",
    entry.fields.journal || "",
    entry.fields.booktitle || "",
    entry.fields.publisher || "",
  ];

  return haystacks.some((value) => normalize(value).includes(q));
}

export function filterBibEntries(entries: BibEntry[], query: string) {
  return entries.filter((entry) => matchesBibEntry(entry, query));
}

export function formatCitationPreview(entry: BibEntry, formatter: CitationFormatter) {
  // Preview the full bibliography form — what users recognize the entry by.
  // For numbered styles (IEEE/plain) the leading "[1] " is stripped along with
  // other markdown so the preview reads as plain author / title text.
  const raw = formatter.formatBibliography(entry, 1);
  return raw.replace(/^\[\d+\]\s*/, "").replace(/_/g, "").replace(/\s+/g, " ").trim();
}

export function formatEntryMeta(entry: BibEntry) {
  const author = entry.fields.author || entry.fields.editor || "Unknown author";
  const year = entry.fields.year || "n.d.";
  return `${author} · ${year}`;
}
