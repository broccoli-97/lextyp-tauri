import { useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
} from "lucide-react";
import type { FileTreeEntry } from "../types/workspace";
import { ContextMenu } from "./ContextMenu";

interface FileTreeItemProps {
  entry: FileTreeEntry;
  depth: number;
  isActive: boolean;
  isExpanded: boolean;
  isDropTarget: boolean;
  onClickDocument: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDelete: (path: string) => void;
  onDragStart?: (path: string) => void;
}

export function FileTreeItem({
  entry,
  depth,
  isActive,
  isExpanded,
  isDropTarget,
  onClickDocument,
  onToggleFolder,
  onRename,
  onDelete,
  onDragStart,
}: FileTreeItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);

  const isFolder = entry.kind === "folder";
  const label = isFolder ? entry.name : entry.title || entry.name;

  const handleClick = useCallback(() => {
    if (isFolder) {
      onToggleFolder(entry.path);
    } else {
      onClickDocument(entry.path);
    }
  }, [isFolder, entry.path, onClickDocument, onToggleFolder]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const startRename = useCallback(() => {
    const currentName = isFolder
      ? entry.name
      : entry.name.replace(/\.lextyp$/, "");
    setRenameValue(currentName);
    setIsRenaming(true);
  }, [isFolder, entry.name]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== entry.name.replace(/\.lextyp$/, "")) {
      onRename(entry.path, trimmed);
    }
    setIsRenaming(false);
  }, [renameValue, entry.path, entry.name, onRename]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        commitRename();
      } else if (e.key === "Escape") {
        setIsRenaming(false);
      }
    },
    [commitRename]
  );

  // Pointer-based drag: track pointerdown, start drag after 4px movement
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isRenaming || e.button !== 0) return;
      pointerOrigin.current = { x: e.clientX, y: e.clientY };
    },
    [isRenaming]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerOrigin.current || !onDragStart) return;
      const dx = e.clientX - pointerOrigin.current.x;
      const dy = e.clientY - pointerOrigin.current.y;
      if (dx * dx + dy * dy > 16) {
        pointerOrigin.current = null;
        onDragStart(entry.path);
      }
    },
    [entry.path, onDragStart]
  );

  const handlePointerUp = useCallback(() => {
    pointerOrigin.current = null;
  }, []);

  const contextItems = [
    { label: "Rename", onClick: startRename },
    { label: "Delete", danger: true, onClick: () => onDelete(entry.path) },
  ];

  return (
    <>
      <div
        data-filetree-path={entry.path}
        data-filetree-kind={entry.kind}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ paddingLeft: depth * 16 + 8 }}
        className={`flex items-center gap-1.5 h-7 pr-2 cursor-pointer rounded-md text-[13px] transition-colors group ${
          isActive
            ? "bg-[var(--accent-light)] text-[var(--accent-dark)]"
            : isDropTarget
              ? "bg-[var(--accent-light)] ring-1 ring-[var(--accent)]"
              : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        }`}
      >
        {/* Expand chevron for folders */}
        {isFolder ? (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        <span className="shrink-0 text-[var(--text-tertiary)]">
          {isFolder ? (
            isExpanded ? (
              <FolderOpen size={14} />
            ) : (
              <Folder size={14} />
            )
          ) : (
            <FileText size={14} />
          )}
        </span>

        {/* Label or rename input */}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 12, height: 20 }}
            className="flex-1 min-w-0 px-1 bg-[var(--bg-primary)] border border-[var(--accent)] rounded outline-none text-[var(--text-primary)]"
          />
        ) : (
          <span className="truncate flex-1 min-w-0">{label}</span>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
