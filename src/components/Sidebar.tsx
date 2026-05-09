import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FilePlus,
  FolderPlus,
  BookOpen,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FolderOpen,
  LogOut,
  Plus,
  FileUp,
  FolderTree,
  Settings,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../stores/workspace-store";
import { useReferenceStore } from "../stores/reference-store";
import { getFormatter } from "../lib/citation/registry";
import { filterBibEntries } from "../lib/citation-search";
import { useT } from "../lib/i18n";
import { EmptyState } from "./EmptyState";
import { FilesPanel } from "./FilesPanel";
import { ReferencesPanel } from "./ReferencesPanel";
import { SettingsPanel } from "./SettingsPanel";

type SidebarTab = "files" | "references" | "settings";

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
  const closeWorkspace = useWorkspaceStore((s) => s.closeWorkspace);

  const entries = useReferenceStore((s) => s.entries);
  const searchQuery = useReferenceStore((s) => s.searchQuery);
  const setSearchQuery = useReferenceStore((s) => s.setSearchQuery);
  const citationStyle = useReferenceStore((s) => s.citationStyle);
  const setFromRaw = useReferenceStore((s) => s.setFromRaw);

  const t = useT();
  const [activeTab, setActiveTab] = useState<SidebarTab>("files");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [newItemInput, setNewItemInput] = useState<"document" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const newMenuRef = useRef<HTMLDivElement>(null);
  const newMenuPortalRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuPortalRef = useRef<HTMLDivElement>(null);
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
    if (!showNewMenu && !showWorkspaceMenu) return;
    const handle = (e: MouseEvent) => {
      if (
        showNewMenu &&
        newMenuRef.current &&
        !newMenuRef.current.contains(e.target as Node) &&
        (!newMenuPortalRef.current || !newMenuPortalRef.current.contains(e.target as Node))
      ) {
        setShowNewMenu(false);
      }
      if (
        showWorkspaceMenu &&
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(e.target as Node) &&
        (!workspaceMenuPortalRef.current || !workspaceMenuPortalRef.current.contains(e.target as Node))
      ) {
        setShowWorkspaceMenu(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showNewMenu, showWorkspaceMenu]);

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

  // Collapsed state — just show the activity bar icons. Same width and
  // surface as the activity bar inside the expanded sidebar so toggling
  // collapse doesn't snap the column wider.
  if (collapsed) {
    return (
      <div className="w-[44px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col items-center pt-2 gap-1 shrink-0">
        <button
          onClick={onToggle}
          className="icon-btn"
          title={t("sidebar.expand")}
        >
          <ChevronsRight size={16} />
        </button>
        <div className="h-1" />
        <ActivityBarButton
          icon={<FolderTree size={16} />}
          active={activeTab === "files"}
          title={t("sidebar.files")}
          onClick={() => { setActiveTab("files"); onToggle(); }}
        />
        <ActivityBarButton
          icon={<BookOpen size={16} />}
          active={activeTab === "references"}
          title={t("sidebar.references")}
          onClick={() => { setActiveTab("references"); onToggle(); }}
        />
        <div className="flex-1" />
        <ActivityBarButton
          icon={<Settings size={16} />}
          active={activeTab === "settings"}
          title={t("settings.title")}
          onClick={() => { setActiveTab("settings"); onToggle(); }}
        />
        <div className="h-2" />
      </div>
    );
  }

  return (
    <div
      style={{ width }}
      className="h-full bg-[var(--bg-secondary)] flex shrink-0 select-none overflow-hidden"
    >
      {/* Activity bar — same surface as the panel content; the divider is
          carried by the right-edge `border-r` in --border (one shade darker
          than --border-light). 44 px matches the collapsed sidebar so
          toggling collapse never widens the column. */}
      <div className="w-[44px] shrink-0 flex flex-col items-center pt-2 gap-0.5 border-r border-[var(--border)]">
        <ActivityBarButton
          icon={<FolderTree size={16} />}
          active={activeTab === "files"}
          title={t("sidebar.files")}
          onClick={() => setActiveTab("files")}
        />
        <ActivityBarButton
          icon={<BookOpen size={16} />}
          active={activeTab === "references"}
          title={t("sidebar.references")}
          onClick={() => setActiveTab("references")}
        />
        <div className="flex-1" />
        <ActivityBarButton
          icon={<Settings size={16} />}
          active={activeTab === "settings"}
          title={t("settings.title")}
          onClick={() => setActiveTab("settings")}
        />
        <div className="h-2" />
      </div>

      {/* Panel content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — 36 px tall to match the editor and PDF toolbars; the
            workspace name doubles as the trigger for switch/close so the
            close-workspace X button (and the standalone footer below) can
            both go away. */}
        <div className="flex items-center justify-between pl-2 pr-1 h-9 shrink-0 border-b border-[var(--border-light)]">
          <div className="relative min-w-0 flex-1" ref={workspaceMenuRef}>
            {workspacePath ? (
              <button
                onClick={() => setShowWorkspaceMenu((v) => !v)}
                className="flex items-center gap-1 max-w-full px-1.5 py-1 rounded-sm text-[12px] font-semibold text-[var(--text-primary)] tracking-tight hover:bg-[var(--bg-hover)] transition-colors"
                title={workspaceName ?? undefined}
              >
                <span className="truncate">{workspaceName}</span>
                <ChevronDown size={12} className="shrink-0 text-[var(--text-tertiary)]" />
              </button>
            ) : (
              <span className="px-1.5 text-[12px] font-semibold text-[var(--text-primary)] tracking-tight">
                LexTyp
              </span>
            )}
            {showWorkspaceMenu && workspacePath && (
              <WorkspaceMenuDropdown
                anchorRef={workspaceMenuRef}
                portalRef={workspaceMenuPortalRef}
                onSwitch={() => {
                  setShowWorkspaceMenu(false);
                  handleOpenWorkspace();
                }}
                onClose={() => {
                  setShowWorkspaceMenu(false);
                  closeWorkspace().catch(console.error);
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {workspacePath && activeTab === "files" && (
              <div className="relative" ref={newMenuRef}>
                <button
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="icon-btn icon-btn-sm"
                  title={t("sidebar.new")}
                >
                  <Plus size={14} />
                </button>
                {showNewMenu && <NewMenuDropdown
                  anchorRef={newMenuRef}
                  portalRef={newMenuPortalRef}
                  onNewDocument={() => handleNewItem("document")}
                  onNewFolder={() => handleNewItem("folder")}
                  onOpenFile={() => { setShowNewMenu(false); openFile().catch(console.error); }}
                />}
              </div>
            )}
            <button
              onClick={onToggle}
              className="icon-btn icon-btn-sm"
              title={t("sidebar.collapse")}
            >
              <ChevronsLeft size={14} />
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {activeTab === "settings" ? (
            <SettingsPanel />
          ) : !workspacePath ? (
            <EmptyState
              icon={<FolderOpen size={22} />}
              title={t("sidebar.noWorkspace")}
              description={t("sidebar.noWorkspaceHint")}
              cta={
                <button onClick={handleOpenWorkspace} className="btn btn-soft">
                  <FolderOpen size={14} />
                  {t("sidebar.openWorkspace")}
                </button>
              }
            />
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
              formatter={formatter}
              activeDocumentPath={activeDocumentPath}
              onInsertCitation={onInsertCitation}
              onImportBib={handleImportBib}
            />
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
      className={`icon-btn ${active ? "is-active" : ""}`}
    >
      {icon}
    </button>
  );
}

/* ─── "+" menu dropdown rendered as portal to escape overflow-hidden ─── */

function NewMenuDropdown({
  anchorRef,
  portalRef,
  onNewDocument,
  onNewFolder,
  onOpenFile,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  onNewDocument: () => void;
  onNewFolder: () => void;
  onOpenFile: () => void;
}) {
  const t = useT();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: Math.max(4, rect.right - 160) });
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={portalRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="menu-surface w-[160px] py-1 animate-fade-in"
    >
      <button
        onClick={onNewDocument}
        className="menu-item whitespace-nowrap"
      >
        <FilePlus size={14} className="shrink-0" />
        {t("sidebar.newDocument")}
      </button>
      <button
        onClick={onNewFolder}
        className="menu-item whitespace-nowrap"
      >
        <FolderPlus size={14} className="shrink-0" />
        {t("sidebar.newFolder")}
      </button>
      <div className="my-0.5 border-t border-[var(--border-light)]" />
      <button
        onClick={onOpenFile}
        className="menu-item whitespace-nowrap"
      >
        <FileUp size={14} className="shrink-0" />
        {t("sidebar.openFile")}
      </button>
    </div>,
    document.body
  );
}

/* ─── Workspace dropdown — opened from clicking the workspace name in
   the header. Houses the actions that previously lived in the sidebar
   footer (Switch workspace) and the standalone X button (Close
   workspace). ─── */

function WorkspaceMenuDropdown({
  anchorRef,
  portalRef,
  onSwitch,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  onSwitch: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={portalRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="menu-surface w-[200px] py-1 animate-fade-in"
    >
      <button
        onClick={onSwitch}
        className="menu-item whitespace-nowrap"
      >
        <FolderOpen size={14} className="shrink-0" />
        {t("sidebar.switchWorkspace")}
      </button>
      <div className="my-0.5 border-t border-[var(--border-light)]" />
      <button
        onClick={onClose}
        className="menu-item menu-item-danger whitespace-nowrap"
      >
        <LogOut size={14} className="shrink-0" />
        {t("sidebar.closeWorkspace")}
      </button>
    </div>,
    document.body
  );
}
