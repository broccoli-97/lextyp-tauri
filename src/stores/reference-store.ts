import { create } from "zustand";
import type { BibEntry } from "../types/bib";
import { parseBibtex } from "../lib/bib-parser";

interface ReferenceState {
  entries: BibEntry[];
  rawBibContent: string;
  searchQuery: string;
  citationStyle: string;
  setEntries: (entries: BibEntry[], raw: string) => void;
  setFromRaw: (raw: string) => void;
  addEntry: (entry: BibEntry) => void;
  updateEntry: (key: string, entry: BibEntry) => void;
  removeEntry: (key: string) => void;
  setSearchQuery: (query: string) => void;
  setCitationStyle: (style: string) => void;
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
  clear: () => set({ entries: [], rawBibContent: "", searchQuery: "" }),
}));
