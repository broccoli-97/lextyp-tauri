import { create } from "zustand";
import type { BibEntry } from "../types/bib";

interface ReferenceState {
  entries: BibEntry[];
  filePath: string;
  searchQuery: string;
  citationStyle: string;
  setEntries: (entries: BibEntry[], filePath: string) => void;
  setSearchQuery: (query: string) => void;
  setCitationStyle: (style: string) => void;
  filteredEntries: () => BibEntry[];
}

export const useReferenceStore = create<ReferenceState>((set, get) => ({
  entries: [],
  filePath: "",
  searchQuery: "",
  citationStyle: "oscola",
  setEntries: (entries, filePath) => set({ entries, filePath }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCitationStyle: (style) => set({ citationStyle: style }),
  filteredEntries: () => {
    const { entries, searchQuery } = get();
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        (e.fields.title || "").toLowerCase().includes(q) ||
        (e.fields.author || "").toLowerCase().includes(q)
    );
  },
}));
