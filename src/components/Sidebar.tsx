import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  FilePlus,
  FolderPlus,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FolderOpen,
  Plus,

  FileDown,
  FileUp,
  FileCode,
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
import { CitationEntryCard } from "./CitationEntryCard";
import { FileTree } from "./FileTree";

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

  const [refsExpanded, setRefsExpanded] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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

  const selectedEntry = selectedKey
    ? entries.find((e) => e.key === selectedKey)
    : null;

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
      setNewItemName(type === "document" ? "Untitled" : "New Folder");
    },
    []
  );

  const commitNewItem = useCallback(async () => {
    if (!newItemInput || !newItemName.trim() || !workspacePath) return;
    if (newItemInput === "document") {
      await createDocument(workspacePath, newItemName.trim());
    } else {
      await createFolder(workspacePath, newItemName.trim());
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

  // Collapsed state
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
    <div
      style={{ width }}
      className="h-full bg-[var(--bg-secondary)] flex flex-col shrink-0 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 shrink-0 border-b border-[var(--border-light)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] flex items-center justify-center shadow-sm shrink-0">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight truncate">
            {workspaceName || "LexTyp"}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {workspacePath && (
            <div className="relative" ref={newMenuRef}>
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="icon-btn w-7 h-7 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                title="New..."
              >
                <Plus size={16} />
              </button>
              {showNewMenu && (
                <div className="absolute top-full right-0 mt-1 w-[160px] py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md shadow-lg z-50 animate-fade-in">
                  <button
                    onClick={() => handleNewItem("document")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
                  >
                    <FilePlus size={13} className="shrink-0" />
                    New Document
                  </button>
                  <button
                    onClick={() => handleNewItem("folder")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
                  >
                    <FolderPlus size={13} className="shrink-0" />
                    New Folder
                  </button>
                  <div className="my-0.5 border-t border-[var(--border-light)]" />
                  <button
                    onClick={() => { setShowNewMenu(false); openFile().catch(console.error); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
                  >
                    <FileUp size={13} className="shrink-0" />
                    Open File...
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onToggle}
            className="icon-btn w-7 h-7 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            title="Collapse sidebar"
          >
            <ChevronsLeft size={16} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {!workspacePath ? (
          /* No workspace - show open prompt */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <FolderOpen size={24} className="text-[var(--text-tertiary)]" />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-medium text-[var(--text-primary)]">
                No workspace open
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                Open a folder to manage your documents
              </p>
            </div>
            <button
              onClick={handleOpenWorkspace}
              className="btn btn-primary h-8 px-4 text-[11px]"
            >
              Open Workspace
            </button>
          </div>
        ) : (
          <>
            {/* File tree */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1">
              {/* New item inline input */}
              {newItemInput && (
                <div className="flex items-center gap-1.5 h-7 px-2 mx-1 my-0.5">
                  {newItemInput === "folder" ? (
                    <FolderPlus
                      size={14}
                      className="shrink-0 text-[var(--text-tertiary)]"
                    />
                  ) : (
                    <FilePlus
                      size={14}
                      className="shrink-0 text-[var(--text-tertiary)]"
                    />
                  )}
                  <input
                    ref={newItemInputRef}
                    value={newItemName}
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

            {/* Document actions */}
            {activeDocumentPath && (
              <div className="shrink-0 border-t border-[var(--border-light)] px-2 py-1.5 space-y-0.5">
                <div className="px-2 py-0.5 text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.08em]">
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

            {/* References section */}
            {activeDocumentPath && (
              <div className="shrink-0 border-t border-[var(--border-light)]">
                <button
                  onClick={() => setRefsExpanded(!refsExpanded)}
                  className="w-full flex items-center gap-1 px-3 py-2 text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.08em] hover:text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
                >
                  {refsExpanded ? (
                    <ChevronDown size={10} />
                  ) : (
                    <ChevronRight size={10} />
                  )}
                  References
                  {entries.length > 0 && (
                    <span className="ml-auto text-[var(--text-tertiary)] font-normal">
                      {entries.length}
                    </span>
                  )}
                </button>

                {refsExpanded && (
                  <div className="px-2 pb-2 max-h-[200px] overflow-y-auto">
                    <button
                      onClick={handleImportBib}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all mb-1"
                    >
                      <BookOpen size={14} className="shrink-0" />
                      <span className="truncate">Import .bib</span>
                    </button>

                    {entries.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-[var(--border-light)]">
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
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setSelectedKey(null);
                            }}
                            style={{
                              height: 26,
                              fontSize: 11,
                              paddingLeft: 26,
                              paddingRight: 8,
                            }}
                            className="input w-full"
                          />
                        </div>

                        {/* Entry count */}
                        <div className="flex items-center px-1 mb-1">
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {filtered.length}/{entries.length}
                          </span>
                        </div>

                        {/* Detail view */}
                        {selectedEntry ? (
                          <div className="space-y-1.5 animate-fade-in">
                            <button
                              onClick={() => setSelectedKey(null)}
                              className="text-[10px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex items-center gap-0.5"
                            >
                              <ChevronRight size={10} />
                              Back
                            </button>
                            <div className="card p-2">
                              <div className="flex items-center gap-1.5">
                                <span className="badge badge-accent text-[8px]">
                                  {selectedEntry.type}
                                </span>
                                <span className="text-[9px] font-mono text-[var(--text-tertiary)] truncate">
                                  @{selectedEntry.key}
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] leading-[1.4] text-[var(--text-primary)] line-clamp-3">
                                {formatCitationPreview(
                                  selectedEntry,
                                  formatter
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                onInsertCitation(selectedEntry.key)
                              }
                              className="btn btn-primary w-full h-6 text-[11px]"
                            >
                              Insert
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {filtered.length === 0 ? (
                              <div className="card py-3 text-[10px] text-[var(--text-tertiary)] text-center border-dashed">
                                No matches
                              </div>
                            ) : (
                              filtered.map((entry) => (
                                <CitationEntryCard
                                  key={entry.key}
                                  entry={entry}
                                  preview={formatCitationPreview(
                                    entry,
                                    formatter
                                  )}
                                  meta={formatEntryMeta(entry)}
                                  active={selectedKey === entry.key}
                                  compact
                                  onClick={() => setSelectedKey(entry.key)}
                                  onInsert={() =>
                                    onInsertCitation(entry.key)
                                  }
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
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-2 py-2 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]">
        {activeDocumentPath && entries.length > 0 && (
          <div className="mb-1.5 relative" ref={styleDropdownRef}>
            <label className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.08em] px-1 mb-1">
              Citation Style
            </label>
            <button
              onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
              style={{ height: 28, fontSize: 11 }}
              className="w-full flex items-center justify-between px-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] font-medium cursor-pointer transition-colors hover:border-[var(--border-hover)]"
            >
              <span>{citationStyle.toUpperCase()}</span>
              <ChevronDown
                size={12}
                className={`text-[var(--text-tertiary)] transition-transform ${
                  styleDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {styleDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md shadow-lg overflow-hidden z-50">
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

        {!workspacePath ? (
          <button
            onClick={handleOpenWorkspace}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all"
          >
            <FolderOpen size={15} className="shrink-0" />
            <span className="truncate">Open Workspace</span>
          </button>
        ) : (
          <button
            onClick={handleOpenWorkspace}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] transition-all"
          >
            <FolderOpen size={15} className="shrink-0 text-[var(--text-secondary)]" />
            <span className="truncate">Switch Workspace</span>
          </button>
        )}
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
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] transition-all"
    >
      <span className="shrink-0 text-[var(--text-secondary)]">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
