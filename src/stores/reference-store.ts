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
  setSearchQuery: (query: string) => void;
  setCitationStyle: (style: string) => void;
  clear: () => void;
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
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCitationStyle: (style) => set({ citationStyle: style }),
  clear: () => set({ entries: [], rawBibContent: "", searchQuery: "" }),
}));
