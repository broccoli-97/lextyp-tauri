import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  FilePlus,
  FolderPlus,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ChevronDown,
  Sparkles,
  FolderOpen,
  Plus,
  FileDown,
  FileUp,
  FileCode,
  FolderTree,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../stores/workspace-store";
import { useReferenceStore } from "../stores/reference-store";
import { getFormatter, getStyleNames } from "../lib/citation/registry";
import {
  filterBibEntries,
  formatCitationPreview,
  formatEntryMeta,
} from "../lib/citation-search";
import { FileTree } from "./FileTree";

type SidebarTab = "files" | "references";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onInsertCitation: (key: string) => void;
  width?: number;
}

export function Sidebar({
  collapsed,
  onToggle,
  onInsertCitation,
  width = 240,
}: SidebarProps) {
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const activeDocumentPath = useWorkspaceStore((s) => s.activeDocumentPath);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const createDocument = useWorkspaceStore((s) => s.createDocument);
  const createFolder = useWorkspaceStore((s) => s.createFolder);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const saveAs = useWorkspaceStore((s) => s.saveAs);
  const exportTypst = useWorkspaceStore((s) => s.exportTypst);

  const entries = useReferenceStore((s) => s.entries);
  const searchQuery = useReferenceStore((s) => s.searchQuery);
  const setSearchQuery = useReferenceStore((s) => s.setSearchQuery);
  const citationStyle = useReferenceStore((s) => s.citationStyle);
  const setCitationStyle = useReferenceStore((s) => s.setCitationStyle);
  const setFromRaw = useReferenceStore((s) => s.setFromRaw);

  const [activeTab, setActiveTab] = useState<SidebarTab>("files");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [newItemInput, setNewItemInput] = useState<"document" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const newMenuRef = useRef<HTMLDivElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);
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

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showNewMenu && !styleDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (
        showNewMenu &&
        newMenuRef.current &&
        !newMenuRef.current.contains(e.target as Node)
      ) {
        setShowNewMenu(false);
      }
      if (
        styleDropdownOpen &&
        styleDropdownRef.current &&
        !styleDropdownRef.current.contains(e.target as Node)
      ) {
        setStyleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showNewMenu, styleDropdownOpen]);

  // Focus new item input
  useEffect(() => {
    if (newItemInput && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [newItemInput]);

  const filtered = useMemo(() => {
    return filterBibEntries(entries, searchQuery);
  }, [entries, searchQuery]);

  const handleOpenWorkspace = useCallback(async () => {
    const selected = await open({ directory: true });
    if (selected) {
      await openWorkspace(selected as string);
    }
  }, [openWorkspace]);

  const handleNewItem = useCallback(
    async (type: "document" | "folder") => {
      setShowNewMenu(false);
      setNewItemInput(type);
      setNewItemName("");
    },
    []
  );

  const commitNewItem = useCallback(async () => {
    if (!newItemInput || !workspacePath) return;
    const name = newItemName.trim() || (newItemInput === "document" ? "Untitled" : "New Folder");
    if (newItemInput === "document") {
      await createDocument(workspacePath, name);
    } else {
      await createFolder(workspacePath, name);
    }
    setNewItemInput(null);
    setNewItemName("");
  }, [newItemInput, newItemName, workspacePath, createDocument, createFolder]);

  const handleImportBib = useCallback(async () => {
    const file = await open({
      filters: [{ name: "BibTeX", extensions: ["bib"] }],
    });
    if (!file) return;
    try {
      const content = await invoke<string>("read_bib_file", {
        path: file,
      });
      setFromRaw(content);
    } catch (err) {
      console.error("Failed to load bib file:", err);
    }
  }, [setFromRaw]);

  const workspaceName = workspacePath
    ? workspacePath.replace(/\\/g, "/").split("/").pop() || "Workspace"
    : null;

  // Collapsed state — just show the activity bar icons
  if (collapsed) {
    return (
      <div className="w-[48px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col items-center pt-3 gap-1 shrink-0">
        <button
          onClick={onToggle}
          className="icon-btn hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] mb-2"
          title="Expand sidebar"
        >
          <ChevronsRight size={18} />
        </button>
        <ActivityBarButton
          icon={<FolderTree size={18} />}
          active={activeTab === "files"}
          title="Files"
          onClick={() => { setActiveTab("files"); onToggle(); }}
        />
        <ActivityBarButton
          icon={<BookOpen size={18} />}
          active={activeTab === "references"}
          title="References"
          onClick={() => { setActiveTab("references"); onToggle(); }}
        />
      </div>
    );
  }

  return (
    <div
      style={{ width }}
      className="h-full bg-[var(--bg-secondary)] flex shrink-0 select-none overflow-hidden"
    >
      {/* Activity bar */}
      <div className="w-[36px] shrink-0 bg-[var(--bg-tertiary)] flex flex-col items-center pt-3 gap-0.5 border-r border-[var(--border-light)]">
        <ActivityBarButton
          icon={<FolderTree size={16} />}
          active={activeTab === "files"}
          title="Files"
          onClick={() => setActiveTab("files")}
        />
        <ActivityBarButton
          icon={<BookOpen size={16} />}
          active={activeTab === "references"}
          title="References"
          onClick={() => setActiveTab("references")}
        />
      </div>

      {/* Panel content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-11 shrink-0 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={10} className="text-white" />
            </div>
            <span className="text-[12px] font-semibold text-[var(--text-primary)] tracking-tight truncate">
              {workspaceName || "LexTyp"}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {workspacePath && activeTab === "files" && (
              <div className="relative" ref={newMenuRef}>
                <button
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="icon-btn w-6 h-6 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  title="New..."
                >
                  <Plus size={14} />
                </button>
                {showNewMenu && (
                  <div className="absolute top-full right-0 mt-1 w-[160px] py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md shadow-lg z-50 animate-fade-in">
                    <button
                      onClick={() => handleNewItem("document")}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
                    >
                      <FilePlus size={14} className="shrink-0" />
                      New Document
                    </button>
                    <button
                      onClick={() => handleNewItem("folder")}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
                    >
                      <FolderPlus size={14} className="shrink-0" />
                      New Folder
                    </button>
                    <div className="my-0.5 border-t border-[var(--border-light)]" />
                    <button
                      onClick={() => { setShowNewMenu(false); openFile().catch(console.error); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
                    >
                      <FileUp size={14} className="shrink-0" />
                      Open File...
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onToggle}
              className="icon-btn w-6 h-6 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              title="Collapse sidebar"
            >
              <ChevronsLeft size={14} />
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {!workspacePath ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <FolderOpen size={24} className="text-[var(--text-tertiary)]" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  No workspace open
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  Open a folder to manage your documents
                </p>
              </div>
              <button
                onClick={handleOpenWorkspace}
                className="btn btn-primary h-8 px-4 text-[12px]"
              >
                Open Workspace
              </button>
            </div>
          ) : activeTab === "files" ? (
            <FilesPanel
              newItemInput={newItemInput}
              newItemName={newItemName}
              newItemInputRef={newItemInputRef}
              setNewItemName={setNewItemName}
              commitNewItem={commitNewItem}
              setNewItemInput={setNewItemInput}
              activeDocumentPath={activeDocumentPath}
              saveAs={saveAs}
              openFile={openFile}
              exportTypst={exportTypst}
            />
          ) : (
            <ReferencesPanel
              entries={entries}
              filtered={filtered}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              citationStyle={citationStyle}
              setCitationStyle={setCitationStyle}
              styleDropdownOpen={styleDropdownOpen}
              setStyleDropdownOpen={setStyleDropdownOpen}
              styleDropdownRef={styleDropdownRef}
              formatter={formatter}
              activeDocumentPath={activeDocumentPath}
              onInsertCitation={onInsertCitation}
              onImportBib={handleImportBib}
            />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-2 py-1.5 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]">
          {!workspacePath ? (
            <button
              onClick={handleOpenWorkspace}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all"
            >
              <FolderOpen size={14} className="shrink-0" />
              <span className="truncate">Open Workspace</span>
            </button>
          ) : (
            <button
              onClick={handleOpenWorkspace}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] transition-all"
            >
              <FolderOpen size={14} className="shrink-0 text-[var(--text-secondary)]" />
              <span className="truncate">Switch Workspace</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Activity bar button ─── */

function ActivityBarButton({
  icon,
  active,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[28px] h-[28px] flex items-center justify-center rounded-md transition-all cursor-pointer ${
        active
          ? "bg-[var(--accent-light)] text-[var(--accent)] shadow-sm"
          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      }`}
    >
      {icon}
    </button>
  );
}

/* ─── Files panel ─── */

function FilesPanel({
  newItemInput,
  newItemName,
  newItemInputRef,
  setNewItemName,
  commitNewItem,
  setNewItemInput,
  activeDocumentPath,
  saveAs,
  openFile,
  exportTypst,
}: {
  newItemInput: "document" | "folder" | null;
  newItemName: string;
  newItemInputRef: React.RefObject<HTMLInputElement | null>;
  setNewItemName: (v: string) => void;
  commitNewItem: () => void;
  setNewItemInput: (v: "document" | "folder" | null) => void;
  activeDocumentPath: string | null;
  saveAs: () => Promise<void>;
  openFile: () => Promise<void>;
  exportTypst: () => Promise<void>;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1">
        {newItemInput && (
          <div className="flex items-center gap-1.5 h-7 px-2 mx-1 my-0.5">
            {newItemInput === "folder" ? (
              <FolderPlus size={14} className="shrink-0 text-[var(--text-tertiary)]" />
            ) : (
              <FilePlus size={14} className="shrink-0 text-[var(--text-tertiary)]" />
            )}
            <input
              ref={newItemInputRef}
              value={newItemName}
              placeholder={newItemInput === "document" ? "Untitled" : "New Folder"}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={commitNewItem}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewItem();
                if (e.key === "Escape") {
                  setNewItemInput(null);
                  setNewItemName("");
                }
              }}
              style={{ fontSize: 12, height: 20 }}
              className="flex-1 min-w-0 px-1 bg-[var(--bg-primary)] border border-[var(--accent)] rounded outline-none text-[var(--text-primary)]"
            />
          </div>
        )}
        <FileTree />
      </div>

      {activeDocumentPath && (
        <div className="shrink-0 border-t border-[var(--border-light)] px-2 py-1.5 space-y-0.5">
          <div className="px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.08em]">
            Document
          </div>
          <SidebarItem
            icon={<FileDown size={14} />}
            label="Save As..."
            onClick={() => saveAs().catch(console.error)}
          />
          <SidebarItem
            icon={<FileUp size={14} />}
            label="Open File..."
            onClick={() => openFile().catch(console.error)}
          />
          <SidebarItem
            icon={<FileCode size={14} />}
            label="Export .typ"
            onClick={() => exportTypst().catch(console.error)}
          />
        </div>
      )}
    </>
  );
}

/* ─── References panel ─── */

function ReferencesPanel({
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
}: {
  entries: any[];
  filtered: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  citationStyle: string;
  setCitationStyle: (s: any) => void;
  styleDropdownOpen: boolean;
  setStyleDropdownOpen: (v: boolean) => void;
  styleDropdownRef: React.RefObject<HTMLDivElement | null>;
  formatter: any;
  activeDocumentPath: string | null;
  onInsertCitation: (key: string) => void;
  onImportBib: () => void;
}) {
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
          <span className="truncate">Import .bib</span>
        </button>

        {entries.length > 0 && (
          <div className="relative" ref={styleDropdownRef}>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.08em] px-1 mb-0.5">
              Citation Style
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
              No references yet. Import a .bib file to get started.
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
                placeholder="Search references..."
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
                            Insert
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

/* ─── Detail field row ─── */

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

/* ─── Shared sidebar item ─── */

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
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] transition-all"
    >
      <span className="shrink-0 text-[var(--text-secondary)]">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
