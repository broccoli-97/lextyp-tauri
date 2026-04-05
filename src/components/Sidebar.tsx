import { useState, useMemo } from "react";
import {
  FilePlus,
  FolderOpen,
  Save,
  FileUp,
  FileDown,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import { useReferenceStore } from "../stores/reference-store";
import { getFormatter, getStyleNames } from "../lib/citation/registry";
import { filterBibEntries, formatCitationPreview, formatEntryMeta } from "../lib/citation-search";
import { CitationEntryCard } from "./CitationEntryCard";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onAction: (action: string) => void;
  onInsertCitation: (key: string) => void;
}

export function Sidebar({ collapsed, onToggle, onAction, onInsertCitation }: SidebarProps) {
  const { entries, searchQuery, setSearchQuery, citationStyle, setCitationStyle } =
    useReferenceStore();
  const [refsExpanded, setRefsExpanded] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const formatter = useMemo(() => getFormatter(citationStyle), [citationStyle]);

  const filtered = useMemo(() => {
    return filterBibEntries(entries, searchQuery);
  }, [entries, searchQuery]);

  const selectedEntry = selectedKey ? entries.find((e) => e.key === selectedKey) : null;

  if (collapsed) {
    return (
      <div className="w-[44px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col items-center pt-3 shrink-0">
        <button onClick={onToggle} className="sidebar-icon-btn" title="Expand sidebar">
          <ChevronsRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[240px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col shrink-0 select-none transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-11 shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--text-secondary)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
            LexTyp
          </span>
        </div>
        <button onClick={onToggle} className="sidebar-icon-btn" title="Collapse sidebar">
          <ChevronsLeft size={16} />
        </button>
      </div>

      {/* Document section */}
      <div className="px-1.5 mt-1">
        <div className="px-2 py-1 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          Document
        </div>
        <SidebarItem icon={<FilePlus size={15} />} label="New" onClick={() => onAction("new")} />
        <SidebarItem icon={<FolderOpen size={15} />} label="Open Project" onClick={() => onAction("open")} />
        <SidebarItem icon={<Save size={15} />} label="Save" onClick={() => onAction("save")} />
        <SidebarItem icon={<FileDown size={15} />} label="Import .typ" onClick={() => onAction("import")} />
        <SidebarItem icon={<FileUp size={15} />} label="Export .typ" onClick={() => onAction("export")} />
      </div>

      {/* References section */}
      <div className="px-1.5 mt-4">
        <button
          onClick={() => setRefsExpanded(!refsExpanded)}
          className="w-full flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors"
        >
          {refsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          References
        </button>

        {refsExpanded && (
          <>
            <SidebarItem
              icon={<BookOpen size={15} />}
              label="Load Bibliography"
              onClick={() => onAction("loadbib")}
            />

            {entries.length > 0 && (
              <div className="mt-2 px-1">
                {/* Search */}
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedKey(null); }}
                    className="w-full h-7 pl-7 pr-2 text-[12px] bg-[var(--bg-primary)] border border-[var(--border)] rounded-md focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                </div>

                {/* Detail view */}
                {selectedEntry ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedKey(null)}
                      className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Back to list
                    </button>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          {selectedEntry.type}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                          @{selectedEntry.key}
                        </span>
                      </div>
                      <div className="mt-2 text-[12px] leading-[1.5] text-[var(--text-primary)]">
                        {formatCitationPreview(selectedEntry, formatter)}
                      </div>
                      <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                        {formatEntryMeta(selectedEntry)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                        Metadata
                      </div>
                      <div className="space-y-2">
                        {Object.entries(selectedEntry.fields)
                      .filter(([, v]) => v)
                      .slice(0, 6)
                      .map(([k, v]) => (
                        <div key={k} className="border-b border-[var(--border)] pb-2 last:border-b-0 last:pb-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                            {k}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-[1.45] text-[var(--text-secondary)]">
                            {v}
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                    <button
                      onClick={() => onInsertCitation(selectedEntry.key)}
                      className="w-full h-8 rounded-lg bg-[var(--accent)] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Insert Citation
                    </button>
                  </div>
                ) : (
                  /* Reference list */
                  <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                    {filtered.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] py-5 text-[11px] text-[var(--text-tertiary)] text-center">
                        No matches
                      </div>
                    ) : (
                      filtered.map((entry) => (
                        <CitationEntryCard
                          key={entry.key}
                          entry={entry}
                          preview={formatCitationPreview(entry, formatter)}
                          meta={formatEntryMeta(entry)}
                          active={selectedKey === entry.key}
                          compact
                          onClick={() => setSelectedKey(entry.key)}
                          onInsert={() => onInsertCitation(entry.key)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom: citation style + settings */}
      <div className="px-1.5 pb-2 space-y-1">
        {entries.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)]">
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">Style</span>
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value)}
              className="flex-1 bg-transparent text-[11px] font-semibold text-[var(--text-primary)] uppercase outline-none cursor-pointer"
            >
              {getStyleNames().map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}
        <SidebarItem icon={<Settings size={15} />} label="Settings" onClick={() => onAction("settings")} />
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-[5px] rounded-md text-[13px] text-[var(--text-secondary)] hover:bg-[var(--hover)] active:bg-[var(--active)] transition-colors"
    >
      <span className="text-[var(--text-tertiary)] shrink-0">{icon}</span>
      {label}
    </button>
  );
}
