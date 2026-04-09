import { useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "../stores/workspace-store";
import { FileTreeItem } from "./FileTreeItem";
import type { FileTreeEntry } from "../types/workspace";

export function FileTree() {
  const fileTree = useWorkspaceStore((s) => s.fileTree);
  const expandedFolders = useWorkspaceStore((s) => s.expandedFolders);
  const activeDocumentPath = useWorkspaceStore((s) => s.activeDocumentPath);
  const toggleFolder = useWorkspaceStore((s) => s.toggleFolder);
  const openDocument = useWorkspaceStore((s) => s.openDocument);
  const renameItem = useWorkspaceStore((s) => s.renameItem);
  const deleteItem = useWorkspaceStore((s) => s.deleteItem);
  const moveItem = useWorkspaceStore((s) => s.moveItem);

  // Pointer-based drag state
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve the display label for the dragged item
  const dragLabel = useRef<string>("");

  const findEntry = useCallback(
    (path: string, entries: FileTreeEntry[]): FileTreeEntry | null => {
      for (const e of entries) {
        if (e.path === path) return e;
        if (e.kind === "folder" && e.children.length > 0) {
          const found = findEntry(path, e.children);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  const handleDragStart = useCallback(
    (path: string) => {
      const entry = findEntry(path, fileTree);
      dragLabel.current =
        entry?.kind === "folder"
          ? entry.name
          : entry?.title || entry?.name || path.split("/").pop() || "";
      setDragSource(path);
      setCursorPos(null);
    },
    [fileTree, findEntry]
  );

  // Global pointermove / pointerup while dragging
  useEffect(() => {
    if (!dragSource) return;

    const handleMove = (e: PointerEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });

      // Hit-test for folder drop targets using data attributes
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(
        "[data-filetree-path]"
      );
      if (el && el.dataset.filetreeKind === "folder") {
        const targetPath = el.dataset.filetreePath!;
        // Don't allow dropping onto self or into a child of self
        if (targetPath !== dragSource && !targetPath.startsWith(dragSource + "/")) {
          setDropTarget(targetPath);
          return;
        }
      }
      setDropTarget(null);
    };

    const handleUp = () => {
      if (dragSource && dropTarget) {
        moveItem(dragSource, dropTarget);
      }
      setDragSource(null);
      setDropTarget(null);
      setCursorPos(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragSource, dropTarget, moveItem]);

  const handleRename = useCallback(
    (oldPath: string, newName: string) => {
      const parts = oldPath.replace(/\\/g, "/").split("/");
      parts.pop();
      const isDoc = oldPath.endsWith(".lextyp");
      const newFileName = isDoc ? `${newName}.lextyp` : newName;
      const newPath = [...parts, newFileName].join("/");
      renameItem(oldPath, newPath);
    },
    [renameItem]
  );

  const handleDelete = useCallback(
    (path: string) => {
      deleteItem(path);
    },
    [deleteItem]
  );

  return (
    <div className="py-1" ref={containerRef}>
      <FileTreeLevel
        entries={fileTree}
        depth={0}
        expandedFolders={expandedFolders}
        activeDocumentPath={activeDocumentPath}
        dropTarget={dropTarget}
        onClickDocument={openDocument}
        onToggleFolder={toggleFolder}
        onRename={handleRename}
        onDelete={handleDelete}
        onDragStart={handleDragStart}
      />

      {/* Floating drag indicator */}
      {dragSource &&
        cursorPos &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: cursorPos.x + 12,
              top: cursorPos.y - 10,
              pointerEvents: "none",
              zIndex: 9999,
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] shadow-lg text-[12px] text-[var(--text-primary)] whitespace-nowrap"
          >
            <FileTreeDragIcon />
            {dragLabel.current}
          </div>,
          document.body
        )}
    </div>
  );
}

function FileTreeDragIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-tertiary)]">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function FileTreeLevel({
  entries,
  depth,
  expandedFolders,
  activeDocumentPath,
  dropTarget,
  onClickDocument,
  onToggleFolder,
  onRename,
  onDelete,
  onDragStart,
}: {
  entries: FileTreeEntry[];
  depth: number;
  expandedFolders: Set<string>;
  activeDocumentPath: string | null;
  dropTarget: string | null;
  onClickDocument: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDelete: (path: string) => void;
  onDragStart: (path: string) => void;
}) {
  return (
    <>
      {entries.map((entry) => {
        const isExpanded =
          entry.kind === "folder" && expandedFolders.has(entry.path);
        const isActive =
          entry.kind === "document" && entry.path === activeDocumentPath;

        return (
          <div key={entry.path}>
            <FileTreeItem
              entry={entry}
              depth={depth}
              isActive={isActive}
              isExpanded={isExpanded}
              isDropTarget={dropTarget === entry.path}
              onClickDocument={onClickDocument}
              onToggleFolder={onToggleFolder}
              onRename={onRename}
              onDelete={onDelete}
              onDragStart={onDragStart}
            />
            {entry.kind === "folder" && isExpanded && entry.children.length > 0 && (
              <FileTreeLevel
                entries={entry.children}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                activeDocumentPath={activeDocumentPath}
                dropTarget={dropTarget}
                onClickDocument={onClickDocument}
                onToggleFolder={onToggleFolder}
                onRename={onRename}
                onDelete={onDelete}
                onDragStart={onDragStart}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
