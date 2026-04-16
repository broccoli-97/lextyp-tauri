import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Settings,
  X,
  MessageSquare,
  History,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../stores/workspace-store";
import { useReferenceStore } from "../stores/reference-store";
import { useReviewStore } from "../stores/review-store";
import { getFormatter } from "../lib/citation/registry";
import { filterBibEntries } from "../lib/citation-search";
import { useT } from "../lib/i18n";
import { FilesPanel } from "./FilesPanel";
import { ReferencesPanel } from "./ReferencesPanel";
import { ReviewPanel } from "./ReviewPanel";
import { HistoryPanel } from "./HistoryPanel";
import { SettingsPanel } from "./SettingsPanel";

type SidebarTab = "files" | "references" | "review" | "history" | "settings";

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
  const setCitationStyle = useReferenceStore((s) => s.setCitationStyle);
  const setFromRaw = useReferenceStore((s) => s.setFromRaw);

  const t = useT();
  const [activeTab, setActiveTab] = useState<SidebarTab>("files");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [newItemInput, setNewItemInput] = useState<"document" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const newMenuRef = useRef<HTMLDivElement>(null);
  const newMenuPortalRef = useRef<HTMLDivElement>(null);
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
        !newMenuRef.current.contains(e.target as Node) &&
        (!newMenuPortalRef.current || !newMenuPortalRef.current.contains(e.target as Node))
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
          title={t("sidebar.expand")}
        >
          <ChevronsRight size={18} />
        </button>
        <ActivityBarButton
          icon={<FolderTree size={18} />}
          active={activeTab === "files"}
          title={t("sidebar.files")}
          onClick={() => { setActiveTab("files"); onToggle(); }}
        />
        <ActivityBarButton
          icon={<BookOpen size={18} />}
          active={activeTab === "references"}
          title={t("sidebar.references")}
          onClick={() => { setActiveTab("references"); onToggle(); }}
        />
        <ActivityBarButton
          icon={<ReviewTabIcon size={18} />}
          active={activeTab === "review"}
          title={t("sidebar.review")}
          onClick={() => { setActiveTab("review"); onToggle(); }}
        />
        <ActivityBarButton
          icon={<History size={18} />}
          active={activeTab === "history"}
          title={t("sidebar.history")}
          onClick={() => { setActiveTab("history"); onToggle(); }}
        />
        <div className="flex-1" />
        <ActivityBarButton
          icon={<Settings size={18} />}
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
      {/* Activity bar */}
      <div className="w-[36px] shrink-0 bg-[var(--bg-tertiary)] flex flex-col items-center pt-3 gap-0.5 border-r border-[var(--border-light)]">
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
        <ActivityBarButton
          icon={<ReviewTabIcon size={16} />}
          active={activeTab === "review"}
          title={t("sidebar.review")}
          onClick={() => setActiveTab("review")}
        />
        <ActivityBarButton
          icon={<History size={16} />}
          active={activeTab === "history"}
          title={t("sidebar.history")}
          onClick={() => setActiveTab("history")}
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
            {workspacePath && (
              <button
                onClick={() => closeWorkspace().catch(console.error)}
                className="icon-btn w-6 h-6 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                title={t("sidebar.closeWorkspace")}
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={onToggle}
              className="icon-btn w-6 h-6 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
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
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
                <FolderOpen size={24} className="text-[var(--text-tertiary)]" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                  {t("sidebar.noWorkspace")}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  {t("sidebar.noWorkspaceHint")}
                </p>
              </div>
              <button
                onClick={handleOpenWorkspace}
                className="btn btn-primary h-8 px-4 text-[12px]"
              >
                {t("sidebar.openWorkspace")}
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
          ) : activeTab === "review" ? (
            <ReviewPanel />
          ) : activeTab === "history" ? (
            <HistoryPanel />
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
              className="sidebar-row-btn sidebar-row-btn-accent"
            >
              <FolderOpen size={14} className="sidebar-row-icon" />
              <span className="truncate">{t("sidebar.openWorkspace")}</span>
            </button>
          ) : activeTab === "files" ? (
            <button
              onClick={handleOpenWorkspace}
              className="sidebar-row-btn"
            >
              <FolderOpen size={14} className="sidebar-row-icon" />
              <span className="truncate">{t("sidebar.switchWorkspace")}</span>
            </button>
          ) : null}
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

/* ─── Review tab icon with unresolved badge ─── */

function ReviewTabIcon({ size }: { size: number }) {
  const unresolvedCount = useReviewStore((s) =>
    s.comments.filter((c) => !c.resolved).length
  );
  return (
    <span className="relative inline-flex">
      <MessageSquare size={size} />
      {unresolvedCount > 0 && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 text-white text-[7px] font-bold flex items-center justify-center leading-none">
          {unresolvedCount > 9 ? "9+" : unresolvedCount}
        </span>
      )}
    </span>
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
