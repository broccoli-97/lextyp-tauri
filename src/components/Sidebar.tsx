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
import { getStyleNames } from "../lib/citation/registry";

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
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedKey(null)}
                      className="text-[11px] text-[var(--accent)] hover:underline"
                    >
                      Back to list
                    </button>
                    <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase">
                      {selectedEntry.type}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--accent)]">
                      @{selectedEntry.key}
                    </div>
                    <div className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">
                      {selectedEntry.fields.title || selectedEntry.key}
                    </div>
                    {Object.entries(selectedEntry.fields)
                      .filter(([, v]) => v)
                      .slice(0, 5)
                      .map(([k, v]) => (
                        <div key={k} className="text-[11px]">
                          <span className="font-medium text-[var(--text-tertiary)] uppercase">{k}: </span>
                          <span className="text-[var(--text-secondary)]">{v}</span>
                        </div>
                      ))}
                    <button
                      onClick={() => onInsertCitation(selectedEntry.key)}
                      className="w-full h-7 mt-1 text-[12px] font-medium bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity"
                    >
                      Insert Citation
                    </button>
                  </div>
                ) : (
                  /* Reference list */
                  <div className="space-y-1 max-h-[300px] overflow-auto">
                    {filtered.length === 0 ? (
                      <div className="text-[11px] text-[var(--text-tertiary)] text-center py-4">
                        No matches
                      </div>
                    ) : (
                      filtered.map((entry) => (
                        <div
                          key={entry.key}
                          onClick={() => setSelectedKey(entry.key)}
                          className="group p-2 rounded-md hover:bg-[var(--hover)] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] uppercase">
                              {entry.type}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                              {entry.key}
                            </span>
                          </div>
                          <div className="text-[12px] font-medium text-[var(--text-primary)] truncate mt-0.5">
                            {entry.fields.title || entry.key}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onInsertCitation(entry.key); }}
                            className="mt-1 text-[10px] text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                          >
                            Insert @{entry.key}
                          </button>
                        </div>
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
