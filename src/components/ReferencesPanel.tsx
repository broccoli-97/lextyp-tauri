import { useState, useMemo } from "react";
import { BookOpen, Search, ChevronDown } from "lucide-react";
import { getStyleNames } from "../lib/citation/registry";
import { formatCitationPreview, formatEntryMeta } from "../lib/citation-search";
import { useT } from "../lib/i18n";
import type { BibEntry } from "../types/bib";
import type { CitationFormatter } from "../lib/citation/formatter";

interface ReferencesPanelProps {
  entries: BibEntry[];
  filtered: BibEntry[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  citationStyle: string;
  setCitationStyle: (s: string) => void;
  styleDropdownOpen: boolean;
  setStyleDropdownOpen: (v: boolean) => void;
  styleDropdownRef: React.RefObject<HTMLDivElement | null>;
  formatter: CitationFormatter;
  activeDocumentPath: string | null;
  onInsertCitation: (key: string) => void;
  onImportBib: () => void;
}

export function ReferencesPanel({
  entries,
  filtered,
  searchQuery,
  setSearchQuery,
  citationStyle,
  setCitationStyle,
  styleDropdownOpen,
  setStyleDropdownOpen,
  styleDropdownRef,
  formatter,
  activeDocumentPath,
  onInsertCitation,
  onImportBib,
}: ReferencesPanelProps) {
  const t = useT();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const entryTypes = useMemo(() => {
    const types = new Set(entries.map((e) => e.type));
    return Array.from(types).sort();
  }, [entries]);

  const displayedEntries = useMemo(() => {
    if (!typeFilter) return filtered;
    return filtered.filter((e) => e.type === typeFilter);
  }, [filtered, typeFilter]);

  if (!activeDocumentPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
        <BookOpen size={24} className="text-[var(--text-tertiary)]" />
        <p className="text-[12px] text-[var(--text-tertiary)] text-center">
          Open a document to manage references
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar: import + style */}
      <div className="shrink-0 px-2 pt-2 pb-1 space-y-1.5 border-b border-[var(--border-light)]">
        <button
          onClick={onImportBib}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all"
        >
          <BookOpen size={14} className="shrink-0" />
          <span className="truncate">{t("refs.importBib")}</span>
        </button>

        {entries.length > 0 && (
          <div className="relative" ref={styleDropdownRef}>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.08em] px-1 mb-0.5">
              {t("refs.style")}
            </label>
            <button
              onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
              style={{ height: 26, fontSize: 11 }}
              className="w-full flex items-center justify-between px-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] font-medium cursor-pointer transition-colors hover:border-[var(--border-hover)]"
            >
              <span>{citationStyle.toUpperCase()}</span>
              <ChevronDown
                size={11}
                className={`text-[var(--text-tertiary)] transition-transform ${
                  styleDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {styleDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md shadow-lg overflow-hidden z-50">
                {getStyleNames().map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setCitationStyle(s);
                      setStyleDropdownOpen(false);
                    }}
                    style={{ fontSize: 11 }}
                    className={`w-full text-left px-2 py-1.5 font-medium transition-colors ${
                      citationStyle === s
                        ? "bg-[var(--accent-light)] text-[var(--accent-dark)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search + list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-2 pt-1.5">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <BookOpen size={20} className="text-[var(--text-tertiary)]" />
            <p className="text-[11px] text-[var(--text-tertiary)] text-center">
              {t("refs.noRefs")}{"\n"}{t("refs.noRefsHint")}
            </p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-1.5">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
              />
              <input
                type="text"
                placeholder={t("refs.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: 26, fontSize: 11, paddingLeft: 26, paddingRight: 8 }}
                className="input w-full"
              />
            </div>

            {/* Type filter tags */}
            {entryTypes.length > 1 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                <button
                  onClick={() => setTypeFilter(null)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                    typeFilter === null
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  All
                </button>
                {entryTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      typeFilter === t
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Count */}
            <div className="flex items-center px-1 mb-1">
              <span className="text-[10px] text-[var(--text-tertiary)]">
                {displayedEntries.length}/{entries.length}
              </span>
            </div>

            {/* Citation cards */}
            <div className="space-y-1.5 pb-2">
              {displayedEntries.length === 0 ? (
                <div className="py-3 text-[11px] text-[var(--text-tertiary)] text-center rounded-xl border border-dashed border-[var(--border)]">
                  No matches
                </div>
              ) : (
                displayedEntries.map((entry) => {
                  const isExpanded = expandedKey === entry.key;
                  return (
                    <div
                      key={entry.key}
                      onClick={() => setExpandedKey(isExpanded ? null : entry.key)}
                      className={[
                        "group rounded-xl border cursor-pointer transition-all duration-200",
                        isExpanded
                          ? "border-[var(--accent)] bg-[var(--accent-light)] shadow-sm"
                          : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-hover)] hover:shadow-sm",
                      ].join(" ")}
                    >
                      {/* Card header */}
                      <div className="px-2.5 py-2">
                        <div className="flex items-center justify-between min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`badge shrink-0 text-[9px] ${isExpanded ? "badge-accent" : ""}`}>
                              {entry.type}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-tertiary)] truncate">
                              @{entry.key}
                            </span>
                          </div>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); onInsertCitation(entry.key); }}
                            className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                          >
                            {t("refs.insert")}
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-[var(--text-primary)] break-words">
                          {entry.fields.title || `@${entry.key}`}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">
                          {formatEntryMeta(entry)}
                        </p>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 pt-0 border-t border-[var(--accent)]/20 animate-fade-in">
                          {/* Formatted citation preview */}
                          <p className="mt-2 text-[11px] leading-[1.6] text-[var(--text-primary)] italic">
                            {formatCitationPreview(entry, formatter)}
                          </p>

                          {/* Structured fields */}
                          <div className="mt-2 space-y-1">
                            <DetailField label="Author" value={entry.fields.author} />
                            <DetailField label="Editor" value={entry.fields.editor} />
                            <DetailField label="Year" value={entry.fields.year} />
                            <DetailField label="Journal" value={entry.fields.journal} />
                            <DetailField label="Book Title" value={entry.fields.booktitle} />
                            <DetailField label="Publisher" value={entry.fields.publisher} />
                            <DetailField label="Volume" value={entry.fields.volume} />
                            <DetailField label="Number" value={entry.fields.number} />
                            <DetailField label="Pages" value={entry.fields.pages} />
                            <DetailField label="Court" value={entry.fields.court} />
                            <DetailField label="School" value={entry.fields.school} />
                            <DetailField label="DOI" value={entry.fields.doi} mono />
                            <DetailField label="URL" value={entry.fields.url} mono />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function DetailField({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[10px] leading-[1.4]">
      <span className="shrink-0 w-[60px] text-[var(--text-tertiary)] font-medium">{label}</span>
      <span className={`min-w-0 break-words text-[var(--text-secondary)] ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
