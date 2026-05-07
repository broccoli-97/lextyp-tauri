import { useState, useMemo, useCallback } from "react";
import { BookOpen, Search, ChevronDown, Plus, Pencil, Trash2, Quote, FileUp } from "lucide-react";
import {
  getOrderedStyleNames,
  getStyleDescription,
  PRIMARY_STYLES,
} from "../lib/citation/registry";
import { formatCitationPreview, formatEntryMeta } from "../lib/citation-search";
import { useT } from "../lib/i18n";
import { useReferenceStore } from "../stores/reference-store";
import { CitationEditor } from "./CitationEditor";
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

// Pluralize a BibTeX entry-type for the filter pills. Falls back to a naive
// "type + s" for anything we don't know about — keeps the panel forgiving
// when users invent custom types in their .bib files.
const TYPE_LABELS: Record<string, string> = {
  article: "Articles",
  book: "Books",
  inbook: "Chapters",
  incollection: "Chapters",
  inproceedings: "Proceedings",
  proceedings: "Proceedings",
  conference: "Proceedings",
  case: "Cases",
  statute: "Statutes",
  legislation: "Legislation",
  hansard: "Hansard",
  online: "Online",
  manual: "Manuals",
  mastersthesis: "Theses",
  phdthesis: "Theses",
  techreport: "Reports",
  unpublished: "Unpublished",
  booklet: "Booklets",
  misc: "Misc",
};

function pluralizeType(type: string): string {
  const key = type.toLowerCase();
  if (TYPE_LABELS[key]) return TYPE_LABELS[key];
  return key.charAt(0).toUpperCase() + key.slice(1) + "s";
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
  const addEntry = useReferenceStore((s) => s.addEntry);
  const updateEntry = useReferenceStore((s) => s.updateEntry);
  const removeEntry = useReferenceStore((s) => s.removeEntry);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingEntry, setEditingEntry] = useState<BibEntry | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);

  const existingKeys = useMemo(() => entries.map((e) => e.key), [entries]);

  const handleCreate = useCallback(() => {
    setEditorMode("create");
    setEditingEntry(null);
  }, []);

  const handleEdit = useCallback((entry: BibEntry) => {
    setEditorMode("edit");
    setEditingEntry(entry);
  }, []);

  const handleSave = useCallback((entry: BibEntry) => {
    if (editorMode === "edit" && editingEntry) {
      updateEntry(editingEntry.key, entry);
    } else {
      addEntry(entry);
    }
    setEditorMode(null);
    setEditingEntry(null);
  }, [editorMode, editingEntry, addEntry, updateEntry]);

  const handleCancelEditor = useCallback(() => {
    setEditorMode(null);
    setEditingEntry(null);
  }, []);

  const handleDelete = useCallback((key: string) => {
    removeEntry(key);
    setDeleteConfirmKey(null);
    if (expandedKey === key) setExpandedKey(null);
  }, [removeEntry, expandedKey]);

  const entryTypes = useMemo(() => {
    const types = new Set(entries.map((e) => e.type));
    return Array.from(types).sort();
  }, [entries]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }, [entries]);

  const displayedEntries = useMemo(() => {
    if (!typeFilter) return filtered;
    return filtered.filter((e) => e.type === typeFilter);
  }, [filtered, typeFilter]);

  if (!activeDocumentPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
        <BookOpen size={24} className="text-[var(--text-tertiary)]" />
        <p className="text-[12px] text-[var(--text-secondary)] text-center">
          {t("refs.needDocument")}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)] text-center">
          {t("refs.needDocumentHint")}
        </p>
      </div>
    );
  }

  if (editorMode) {
    return (
      <CitationEditor
        editEntry={editingEntry}
        existingKeys={existingKeys}
        onSave={handleSave}
        onCancel={handleCancelEditor}
      />
    );
  }

  return (
    <>
      {/* Toolbar: import + add → search → style card. The trio is the
          information density at the top of the panel — every action a user
          starts with happens here. */}
      <div className="shrink-0 px-2 pt-2 pb-2 space-y-2 border-b border-[var(--border-light)]">
        <div className="flex gap-1.5">
          <button
            onClick={onImportBib}
            className="btn btn-quiet flex-1"
          >
            <FileUp size={13} className="shrink-0" />
            <span className="truncate">{t("refs.importBib")}</span>
          </button>
          <button
            onClick={handleCreate}
            className="btn btn-soft"
            title={t("refs.addNew")}
          >
            <Plus size={13} className="shrink-0" />
            <span>{t("refs.add")}</span>
          </button>
        </div>

        {entries.length > 0 && (
          <div className="ref-search">
            <Search size={12} className="ref-search-icon" />
            <input
              type="text"
              placeholder={t("refs.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {entries.length > 0 && (
          <div className="relative" ref={styleDropdownRef}>
            <label className="panel-section-label block px-1 mb-1">
              {t("refs.style")}
            </label>
            <button
              onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
              className={`ref-style-card ${styleDropdownOpen ? "is-open" : ""}`}
            >
              <span className="ref-style-icon">
                <Quote size={14} />
              </span>
              <span className="ref-style-meta">
                <span className="ref-style-name">{citationStyle.toUpperCase()}</span>
                {getStyleDescription(citationStyle) && (
                  <span className="ref-style-desc">
                    {getStyleDescription(citationStyle)}
                  </span>
                )}
              </span>
              <ChevronDown size={12} className="ref-style-chevron" />
            </button>
            {styleDropdownOpen && (
              <div className="menu-surface absolute top-full left-0 right-0 mt-1 overflow-hidden z-50 animate-fade-in">
                {getOrderedStyleNames().map((s, i) => (
                  <div key={s}>
                    {i === PRIMARY_STYLES.length && (
                      <div className="my-0.5 border-t border-[var(--border-light)]" />
                    )}
                    <button
                      onClick={() => {
                        setCitationStyle(s);
                        setStyleDropdownOpen(false);
                      }}
                      className={`menu-item flex-col items-start ${
                        citationStyle === s
                          ? "bg-[var(--accent-light)] text-[var(--accent-dark)]"
                          : ""
                      }`}
                    >
                      <span className="font-semibold tracking-wide text-[11px]">
                        {s.toUpperCase()}
                      </span>
                      {getStyleDescription(s) && (
                        <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                          {getStyleDescription(s)}
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* List body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-2 pt-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <BookOpen size={20} className="text-[var(--text-tertiary)]" />
            <p className="text-[11px] text-[var(--text-tertiary)] text-center">
              {t("refs.noRefs")}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] text-center">
              {t("refs.noRefsHint")}
            </p>
          </div>
        ) : (
          <>
            {/* Type filter pills with counts */}
            {entryTypes.length > 1 && (
              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  onClick={() => setTypeFilter(null)}
                  className={`ref-pill ${typeFilter === null ? "ref-pill-active" : ""}`}
                >
                  <span>All</span>
                  <span className="ref-pill-count">{entries.length}</span>
                </button>
                {entryTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                    className={`ref-pill ${typeFilter === type ? "ref-pill-active" : ""}`}
                  >
                    <span>{pluralizeType(type)}</span>
                    <span className="ref-pill-count">{typeCounts[type]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Counter row */}
            <div className="ref-counter">
              <span>
                <strong>{displayedEntries.length}</strong>
                {" / "}
                {entries.length} {t("refs.references")}
              </span>
            </div>

            {/* Citation cards */}
            <div className="space-y-1.5 pb-3">
              {displayedEntries.length === 0 ? (
                <div className="ref-empty">{t("refs.noMatches")}</div>
              ) : (
                displayedEntries.map((entry) => {
                  const isOpen = expandedKey === entry.key;
                  return (
                    <div
                      key={entry.key}
                      onClick={() => setExpandedKey(isOpen ? null : entry.key)}
                      className={`ref-card ${isOpen ? "is-open" : ""}`}
                    >
                      <div className="ref-card-head">
                        <div className="ref-card-meta">
                          <span className="ref-card-tag">{entry.type}</span>
                          <span className="ref-card-key">@{entry.key}</span>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onInsertCitation(entry.key);
                            }}
                            className="btn btn-soft btn-sm"
                          >
                            {t("refs.insert")}
                          </button>
                        </div>
                        <p className="ref-card-title">
                          {entry.fields.title || `@${entry.key}`}
                        </p>
                        <p className="ref-card-source">{formatEntryMeta(entry)}</p>
                      </div>

                      {isOpen && (
                        <div className="ref-card-body animate-fade-in">
                          <p className="ref-card-preview">
                            {formatCitationPreview(entry, formatter)}
                          </p>

                          <div className="ref-card-fields">
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

                          <div className="ref-card-actions">
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleEdit(entry);
                              }}
                              className="btn btn-quiet btn-sm"
                            >
                              <Pencil size={11} />
                              {t("refs.edit")}
                            </button>
                            {deleteConfirmKey === entry.key ? (
                              <div
                                className="flex items-center gap-1.5 flex-wrap"
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                <span className="text-[10.5px] text-[var(--error)]">
                                  {t("refs.deleteConfirm")}
                                </span>
                                <button
                                  onClick={() => handleDelete(entry.key)}
                                  className="btn btn-danger btn-sm"
                                >
                                  {t("refs.delete")}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmKey(null)}
                                  className="btn btn-quiet btn-sm"
                                >
                                  {t("refs.cancel")}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setDeleteConfirmKey(entry.key);
                                }}
                                className="btn btn-quiet btn-sm btn-danger-soft"
                              >
                                <Trash2 size={11} />
                                {t("refs.delete")}
                              </button>
                            )}
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

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="ref-card-field">
      <span className="ref-card-field-label">{label}</span>
      <span className={`ref-card-field-value ${mono ? "is-mono" : ""}`}>{value}</span>
    </div>
  );
}
