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
    <div className="absolute inset-0 z-40 flex items-start justify-center bg-[rgba(247,247,245,0.72)] px-6 pt-16 backdrop-blur-[2px]">
      <div className="w-full max-w-[640px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_18px_50px_rgba(55,53,47,0.12)]">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
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
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] pl-10 pr-3 text-[13px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
            />
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 text-[11px] text-[var(--text-secondary)]">
          <span>{filtered.length} references</span>
          <span>Enter to insert</span>
        </div>

        <div className="max-h-[420px] overflow-auto p-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] px-4 py-8 text-center">
              <p className="text-[13px] text-[var(--text-primary)]">No matching citation</p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Load a bibliography or refine your search terms.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
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
