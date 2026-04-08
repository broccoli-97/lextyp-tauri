import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  FilePlus,
  FolderPlus,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  FolderOpen,
  Plus,
  FileUp,
  FolderTree,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../stores/workspace-store";
import { useReferenceStore } from "../stores/reference-store";
import { getFormatter } from "../lib/citation/registry";
import { filterBibEntries } from "../lib/citation-search";
import { FilesPanel } from "./FilesPanel";
import { ReferencesPanel } from "./ReferencesPanel";

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
