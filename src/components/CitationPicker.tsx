import { useEffect, useMemo, useRef, useState } from "react";
import type { BibEntry } from "../types/bib";
import type { CitationFormatter } from "../lib/citation/formatter";
import { filterBibEntries, formatCitationPreview } from "../lib/citation-search";

interface CitationPickerProps {
  open: boolean;
  entries: BibEntry[];
  formatter: CitationFormatter;
  onClose: () => void;
  onSelect: (key: string) => void;
}

type TabId = "all" | "cases" | "books" | "journals" | "statutes" | "recent";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cases", label: "Cases" },
  { id: "books", label: "Books" },
  { id: "journals", label: "Journals" },
  { id: "statutes", label: "Statutes" },
  { id: "recent", label: "Recent" },
];

const RECENT_STORAGE_KEY = "lextyp.citation-picker.recent";
const RECENT_MAX = 12;

const TYPE_TO_TAB: Record<string, TabId> = {
  case: "cases",
  book: "books",
  inbook: "books",
  incollection: "books",
  booklet: "books",
  manual: "books",
  proceedings: "books",
  article: "journals",
  statute: "statutes",
  act: "statutes",
  legislation: "statutes",
};

const TYPE_TO_KIND: Record<string, string> = {
  case: "CASE",
  book: "BOOK",
  inbook: "CHAPTER",
  incollection: "CHAPTER",
  booklet: "BOOK",
  manual: "MANUAL",
  proceedings: "PROC",
  article: "ARTICLE",
  statute: "STATUTE",
  act: "STATUTE",
  legislation: "STATUTE",
  thesis: "THESIS",
  phdthesis: "THESIS",
  mastersthesis: "THESIS",
  techreport: "REPORT",
  online: "ONLINE",
  misc: "MISC",
};

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function pushRecent(key: string) {
  try {
    const next = [key, ...loadRecent().filter((k) => k !== key)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / serialization errors */
  }
}

function kindLabel(type: string) {
  return TYPE_TO_KIND[type.toLowerCase()] ?? type.toUpperCase().slice(0, 6);
}

function entryTitle(entry: BibEntry) {
  return entry.fields.title?.replace(/[{}]/g, "").trim() || entry.key;
}

function entryMeta(entry: BibEntry, formatter: CitationFormatter) {
  const preview = formatCitationPreview(entry, formatter);
  const title = entry.fields.title?.replace(/[{}]/g, "").trim();
  if (!title) return preview;
  // Remove the title (and surrounding punctuation) from the preview so the
  // meta line carries only the reference details — author, year, citation.
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return preview
    .replace(new RegExp(`['"‘’“”]?${escaped}['"‘’“”]?[,.;:]?`), "")
    .replace(/\s+/g, " ")
    .replace(/^[—–-]\s*/, "")
    .trim();
}

export function CitationPicker({
  open,
  entries,
  formatter,
  onClose,
  onSelect,
}: CitationPickerProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabId>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setRecentKeys(loadRecent());
  }, [open]);

  const filtered = useMemo(() => {
    let pool = entries;
    if (tab === "recent") {
      const order = new Map(recentKeys.map((k, i) => [k, i] as const));
      pool = entries
        .filter((e) => order.has(e.key))
        .sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
    } else if (tab !== "all") {
      pool = entries.filter((e) => TYPE_TO_TAB[e.type.toLowerCase()] === tab);
    }
    return filterBibEntries(pool, query);
  }, [entries, query, tab, recentKeys]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTab("all");
      setActiveIndex(0);
      return;
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, tab]);

  function handleSelect(key: string) {
    pushRecent(key);
    setRecentKeys((prev) => [key, ...prev.filter((k) => k !== key)].slice(0, RECENT_MAX));
    onSelect(key);
  }

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

      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        const idx = TABS.findIndex((t) => t.id === tab);
        setTab(TABS[(idx + 1) % TABS.length].id);
        return;
      }

      if (event.key === "Tab" && event.shiftKey) {
        event.preventDefault();
        const idx = TABS.findIndex((t) => t.id === tab);
        setTab(TABS[(idx - 1 + TABS.length) % TABS.length].id);
        return;
      }

      if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        handleSelect(filtered[activeIndex].key);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filtered, onClose, open, tab]);

  if (!open) return null;

  return (
    <div
      className="palette-overlay animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-label="Insert citation">
        <div className="palette-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`palette-tab ${tab === t.id ? "palette-tab-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="palette-search">
          <span className="palette-prefix">/cite</span>
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="search by title, author, key…"
            spellCheck={false}
          />
          <span className="kbd" aria-hidden="true">⌘K</span>
        </div>

        <div className="palette-list">
          {filtered.length === 0 ? (
            <div className="palette-empty">
              <div className="palette-empty-title">No matching citations</div>
              <div>Try a different tab or refine your search.</div>
            </div>
          ) : (
            filtered.map((entry, index) => {
              const selected = index === activeIndex;
              return (
                <button
                  key={entry.key}
                  type="button"
                  className={`palette-item ${selected ? "palette-item-sel" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(entry.key)}
                >
                  <span className="palette-kind">{kindLabel(entry.type)}</span>
                  <span className="palette-item-text">
                    <span className="palette-title">{entryTitle(entry)}</span>
                    <span className="palette-meta">{entryMeta(entry, formatter)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="palette-foot">
          <span className="palette-foot-group">
            <span className="kbd">↑↓</span> navigate
          </span>
          <span className="palette-foot-group">
            <span className="kbd">↵</span> insert
          </span>
          <span className="palette-foot-group">
            <span className="kbd">⇥</span> switch tab
          </span>
          <span className="palette-foot-group">
            <span className="kbd">esc</span>
          </span>
        </div>
      </div>
    </div>
  );
}
