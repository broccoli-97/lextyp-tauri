import { useState, useMemo, useCallback } from "react";
import { BookOpen, Search, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import { getOrderedStyleNames, PRIMARY_STYLES } from "../lib/citation/registry";
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

  // Show citation editor overlay
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
      {/* Toolbar: import + add + style */}
      <div className="shrink-0 px-2 pt-2 pb-1 space-y-1.5 border-b border-[var(--border-light)]">
        <div className="flex gap-1.5">
          <button
            onClick={onImportBib}
            className="sidebar-row-btn sidebar-row-btn-accent flex-1"
          >
            <BookOpen size={14} className="shrink-0" />
            <span className="truncate">{t("refs.importBib")}</span>
          </button>
          <button
            onClick={handleCreate}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all"
            title={t("refs.addNew")}
          >
            <Plus size={16} />
          </button>
        </div>

        {entries.length > 0 && (
          <div className="relative" ref={styleDropdownRef}>
            <label className="panel-section-label block px-1 mb-0.5">
              {t("refs.style")}
            </label>
            <button
              onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
              className="compact-control flex items-center justify-between px-2 font-medium cursor-pointer"
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
              <div className="menu-surface absolute top-full left-0 right-0 mt-1 overflow-hidden z-50">
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
                      className={`menu-item ${
                        citationStyle === s
                          ? "bg-[var(--accent-light)] text-[var(--accent-dark)]"
                          : ""
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  </div>
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
              {t("refs.noRefs")}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] text-center">
              {t("refs.noRefsHint")}
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
                className="compact-control compact-control-search"
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

                          {/* Edit / Delete actions */}
                          <div className="mt-2.5 pt-2 border-t border-[var(--accent)]/15 flex gap-1.5">
                            <button
                              onClick={(ev) => { ev.stopPropagation(); handleEdit(entry); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                            >
                              <Pencil size={11} />
                              {t("refs.edit")}
                            </button>
                            {deleteConfirmKey === entry.key ? (
                              <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                                <span className="text-[10px] text-[var(--error)]">{t("refs.deleteConfirm")}</span>
                                <button
                                  onClick={() => handleDelete(entry.key)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white bg-[var(--error)] hover:opacity-90 transition-opacity"
                                >
                                  {t("refs.delete")}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmKey(null)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                                >
                                  {t("refs.cancel")}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(ev) => { ev.stopPropagation(); setDeleteConfirmKey(entry.key); }}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[var(--error)] hover:bg-[var(--error-light)] transition-colors"
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
