import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { BibEntry } from "../types/bib";
import type { CitationFormatter } from "../lib/citation/formatter";
import { filterBibEntries, formatCitationPreview, formatEntryMeta } from "../lib/citation-search";
import { CitationEntryCard } from "./CitationEntryCard";

interface CitationPickerProps {
  open: boolean;
  entries: BibEntry[];
  formatter: CitationFormatter;
  onClose: () => void;
  onSelect: (key: string) => void;
}

export function CitationPicker({
  open,
  entries,
  formatter,
  onClose,
  onSelect,
}: CitationPickerProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => filterBibEntries(entries, query), [entries, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        onSelect(filtered[activeIndex].key);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, filtered, onClose, onSelect, open]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center bg-black/20 backdrop-blur-sm px-6 pt-20 animate-fade-in">
      <div className="w-full max-w-[640px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl animate-slide-in">
        <div className="flex items-center gap-3 border-b border-[var(--border-light)] px-4 py-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search citations by key, title, author..."
              className="input h-10 pl-10 text-[13px]"
            />
          </div>

          <button
            onClick={onClose}
            className="icon-btn w-9 h-9"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-2 text-[11px] text-[var(--text-tertiary)]">
          <span className="font-medium">{filtered.length} references</span>
          <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[10px]">Enter to insert</span>
        </div>

        <div className="max-h-[420px] overflow-auto p-3">
          {filtered.length === 0 ? (
            <div className="card py-10 text-center border-dashed">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">No matching citations</p>
              <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                Load a bibliography or refine your search terms
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((entry, index) => (
                <CitationEntryCard
                  key={entry.key}
                  entry={entry}
                  preview={formatCitationPreview(entry, formatter)}
                  meta={formatEntryMeta(entry)}
                  active={index === activeIndex}
                  onClick={() => onSelect(entry.key)}
                  onInsert={() => onSelect(entry.key)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
