import { useState, useMemo } from "react";
import { useReferenceStore } from "../stores/reference-store";
import { getStyleNames } from "../lib/citation/registry";

interface ReferencePanelProps {
  onInsertCitation: (key: string) => void;
}

export function ReferencePanel({ onInsertCitation }: ReferencePanelProps) {
  const { entries, searchQuery, setSearchQuery, citationStyle, setCitationStyle } =
    useReferenceStore();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        (e.fields.title || "").toLowerCase().includes(q) ||
        (e.fields.author || "").toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const selectedEntry = selectedKey ? entries.find((e) => e.key === selectedKey) : null;

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      {/* Header */}
      <div className="px-3 py-2.5 font-semibold text-sm text-[#1A1A1A]">References</div>

      {/* Search */}
      <div className="px-2 pb-2">
        <input
          type="text"
          placeholder="Search references..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-8 px-2.5 text-xs border border-[#E0E0E0] rounded focus:border-[#2979FF] focus:outline-none bg-white"
        />
      </div>

      {/* Entry detail view */}
      {selectedEntry ? (
        <div className="flex-1 overflow-auto px-3">
          <button
            onClick={() => setSelectedKey(null)}
            className="text-xs text-[#2979FF] hover:underline mb-2"
          >
            &larr; Back
          </button>
          <div className="text-[10px] font-bold text-[#757575] uppercase mb-1">
            {selectedEntry.type}
          </div>
          <div className="text-xs font-mono text-[#2979FF] mb-1">@{selectedEntry.key}</div>
          <div className="text-sm font-bold text-[#212121] mb-2">
            {selectedEntry.fields.title || selectedEntry.key}
          </div>
          <div className="space-y-1.5 text-xs">
            {Object.entries(selectedEntry.fields)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <span className="font-bold text-[#757575] uppercase text-[10px]">{k}</span>
                  <div className="text-[#424242]">{v}</div>
                </div>
              ))}
          </div>
          <button
            onClick={() => onInsertCitation(selectedEntry.key)}
            className="w-full mt-3 h-8 bg-blue-50 text-[#2979FF] text-xs font-medium rounded hover:bg-[#2979FF] hover:text-white transition-colors"
          >
            Insert Citation
          </button>
        </div>
      ) : (
        /* Entry list */
        <div className="flex-1 overflow-auto px-2">
          {filtered.length === 0 ? (
            <div className="text-center text-xs text-[#9E9E9E] mt-8">
              {entries.length === 0 ? "No references loaded.\nLoad a .bib file." : "No matches."}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((entry) => (
                <div
                  key={entry.key}
                  onClick={() => setSelectedKey(entry.key)}
                  className="p-2 rounded border border-[#E0E0E0] bg-white hover:border-[#2979FF] cursor-pointer transition-colors"
                >
                  <div className="text-[10px] font-bold text-[#757575] uppercase">
                    {entry.type}
                  </div>
                  <div className="text-xs font-bold text-[#212121] truncate">
                    {entry.fields.title || entry.key}
                  </div>
                  {entry.fields.author && (
                    <div className="text-[10px] text-[#757575] truncate">{entry.fields.author}</div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onInsertCitation(entry.key); }}
                    className="w-full mt-1.5 h-6 bg-blue-50 text-[#2979FF] text-[10px] font-medium rounded hover:bg-[#2979FF] hover:text-white transition-colors"
                  >
                    Insert
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Style selector */}
      <div className="px-2 py-2 border-t border-[#E0E0E0]">
        <div className="flex items-center gap-1.5 bg-blue-50 rounded px-2 h-7">
          <span className="text-[10px] font-bold text-[#616161]">Style:</span>
          <select
            value={citationStyle}
            onChange={(e) => setCitationStyle(e.target.value)}
            className="flex-1 bg-transparent text-[10px] font-bold text-[#2979FF] uppercase outline-none cursor-pointer"
          >
            {getStyleNames().map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
