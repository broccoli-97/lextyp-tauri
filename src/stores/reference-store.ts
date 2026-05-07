import { create } from "zustand";
import type { BibEntry } from "../types/bib";
import { parseBibtex } from "../lib/bib-parser";

/**
 * Editor-side rendering of citation tags.
 *
 * - `chip` — show the `@key` tag inline. Clicking it opens a small card with
 *   the underlying bibliography record.
 * - `footnote` — hide `@key` and render a small superscript number that
 *   mirrors the footnote markers in the compiled PDF. The block of text
 *   containing the citation is decorated with a thin underline so authors can
 *   still see at a glance which passages carry references.
 *
 * This is purely a *display* setting — it does not change the BibTeX, the
 * stored document, or the Typst output.
 */
export type CitationDisplay = "chip" | "footnote";

interface ReferenceState {
  entries: BibEntry[];
  rawBibContent: string;
  searchQuery: string;
  citationStyle: string;
  citationDisplay: CitationDisplay;
  /**
   * DOM id of the citation tag whose details card is currently open, or
   * `null` if no card is showing. Centralised here so opening one card
   * closes any other — clicks across tags coordinate through the store
   * instead of each tag carrying its own open/closed state.
   */
  openCitationTagId: string | null;
  setEntries: (entries: BibEntry[], raw: string) => void;
  setFromRaw: (raw: string) => void;
  addEntry: (entry: BibEntry) => void;
  updateEntry: (key: string, entry: BibEntry) => void;
  removeEntry: (key: string) => void;
  setSearchQuery: (query: string) => void;
  setCitationStyle: (style: string) => void;
  setCitationDisplay: (display: CitationDisplay) => void;
  toggleCitationDisplay: () => void;
  setOpenCitationTagId: (id: string | null) => void;
  clear: () => void;
}

/** Serialize a single BibEntry back to BibTeX text. */
function entryToBibtex(entry: BibEntry): string {
  const fields = Object.entries(entry.fields)
    .filter(([, v]) => v.trim() !== "")
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(",\n");
  return `@${entry.type}{${entry.key},\n${fields}\n}`;
}

/** Rebuild raw BibTeX from all entries. */
function rebuildRaw(entries: BibEntry[]): string {
  return entries.map(entryToBibtex).join("\n\n") + "\n";
}

export const useReferenceStore = create<ReferenceState>((set) => ({
  entries: [],
  rawBibContent: "",
  searchQuery: "",
  citationStyle: "oscola",
  citationDisplay: "chip",
  openCitationTagId: null,
  setEntries: (entries, raw) => set({ entries, rawBibContent: raw }),
  setFromRaw: (raw) => {
    const entries = parseBibtex(raw);
    set({ entries, rawBibContent: raw });
  },
  addEntry: (entry) => {
    const prev = useReferenceStore.getState().entries;
    // Reject duplicate keys
    if (prev.some((e) => e.key === entry.key)) return;
    const next = [...prev, entry];
    set({ entries: next, rawBibContent: rebuildRaw(next) });
  },
  updateEntry: (key, entry) => {
    const prev = useReferenceStore.getState().entries;
    const next = prev.map((e) => (e.key === key ? entry : e));
    set({ entries: next, rawBibContent: rebuildRaw(next) });
  },
  removeEntry: (key) => {
    const prev = useReferenceStore.getState().entries;
    const next = prev.filter((e) => e.key !== key);
    set({ entries: next, rawBibContent: rebuildRaw(next) });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCitationStyle: (style) => set({ citationStyle: style }),
  setCitationDisplay: (display) => set({ citationDisplay: display }),
  toggleCitationDisplay: () => set((s) => ({
    citationDisplay: s.citationDisplay === "chip" ? "footnote" : "chip",
  })),
  setOpenCitationTagId: (id) => set({ openCitationTagId: id }),
  clear: () => set({ entries: [], rawBibContent: "", searchQuery: "" }),
}));
