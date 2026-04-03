export interface BibEntry {
  key: string;
  type: string;
  fields: Record<string, string>;
}

export interface CitationHistoryEntry {
  key: string;
  footnoteNumber: number;
}
