import { useState, useMemo, useEffect } from "react";
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
  Sparkles,
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

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 700 && !collapsed) {
        onToggle();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [collapsed, onToggle]);

  const filtered = useMemo(() => {
    return filterBibEntries(entries, searchQuery);
  }, [entries, searchQuery]);

  const selectedEntry = selectedKey ? entries.find((e) => e.key === selectedKey) : null;

  if (collapsed) {
    return (
      <div className="w-[48px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col items-center pt-4 shrink-0">
        <button
          onClick={onToggle}
          className="icon-btn hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="Expand sidebar"
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[240px] min-w-[200px] max-w-[280px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col shrink-0 select-none">
      {/* Header - fixed */}
      <div className="flex items-center justify-between px-3 h-12 shrink-0 border-b border-[var(--border-light)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center shadow-sm">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
            LexTyp
          </span>
        </div>
        <button
          onClick={onToggle}
          className="icon-btn hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="Collapse sidebar"
        >
          <ChevronsLeft size={16} />
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Document section */}
        <div className="px-2 mt-3">
          <SectionLabel>Document</SectionLabel>
          <div className="mt-1 space-y-0.5">
            <SidebarItem icon={<FilePlus size={15} />} label="New" onClick={() => onAction("new")} />
            <SidebarItem icon={<FolderOpen size={15} />} label="Open" onClick={() => onAction("open")} />
            <SidebarItem icon={<Save size={15} />} label="Save" onClick={() => onAction("save")} />
            <SidebarItem icon={<FileDown size={15} />} label="Import" onClick={() => onAction("import")} />
            <SidebarItem icon={<FileUp size={15} />} label="Export" onClick={() => onAction("export")} />
          </div>
        </div>

        {/* References section */}
        <div className="px-2 mt-4">
          <CollapsibleSection
            label="References"
            expanded={refsExpanded}
            onToggle={() => setRefsExpanded(!refsExpanded)}
          />

          {refsExpanded && (
            <div className="mt-1 space-y-0.5">
              <SidebarItem
                icon={<BookOpen size={15} />}
                label="Load Bibliography"
                onClick={() => onAction("loadbib")}
                highlight
              />

              {entries.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border-light)]">
                  {/* Search */}
                  <div className="relative mb-2">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSelectedKey(null); }}
                      className="input pl-8 h-7 text-[11px]"
                    />
                  </div>

                  {/* Entry count */}
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {filtered.length}/{entries.length}
                    </span>
                  </div>

                  {/* Detail view */}
                  {selectedEntry ? (
                    <div className="space-y-2 animate-fade-in">
                      <button
                        onClick={() => setSelectedKey(null)}
                        className="text-[10px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex items-center gap-0.5"
                      >
                        <ChevronRight size={10} />
                        Back
                      </button>
                      <div className="card p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="badge badge-accent text-[8px]">
                            {selectedEntry.type}
                          </span>
                          <span className="text-[9px] font-mono text-[var(--text-tertiary)] truncate">
                            @{selectedEntry.key}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[11px] leading-[1.5] text-[var(--text-primary)] line-clamp-3">
                          {formatCitationPreview(selectedEntry, formatter)}
                        </div>
                      </div>
                      <button
                        onClick={() => onInsertCitation(selectedEntry.key)}
                        className="btn btn-primary w-full h-7 text-[11px]"
                      >
                        Insert
                      </button>
                    </div>
                  ) : (
                    /* Reference list */
                    <div className="space-y-1 max-h-[200px] overflow-auto pr-0.5">
                      {filtered.length === 0 ? (
                        <div className="card py-4 text-[10px] text-[var(--text-tertiary)] text-center border-dashed">
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
            </div>
          )}
        </div>
      </div>

      {/* Bottom section - fixed at bottom */}
      <div className="shrink-0 px-2 py-2 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]">
        {entries.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] mb-1.5">
            <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase">Style</span>
            <select
              value={citationStyle}
              onChange={(e) => setCitationStyle(e.target.value)}
              className="flex-1 bg-transparent text-[10px] font-semibold text-[var(--text-primary)] uppercase outline-none cursor-pointer"
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1 text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.08em]">
      {children}
    </div>
  );
}

function CollapsibleSection({
  label,
  expanded,
  onToggle,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.08em] hover:text-[var(--text-primary)] transition-colors rounded-md hover:bg-[var(--bg-hover)]"
    >
      {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      {label}
    </button>
  );
}

function SidebarItem({
  icon,
  label,
  onClick,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${
        highlight
          ? "text-[var(--accent)] hover:bg-[var(--accent-light)]"
          : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)]"
      }`}
    >
      <span className={`shrink-0 ${highlight ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
