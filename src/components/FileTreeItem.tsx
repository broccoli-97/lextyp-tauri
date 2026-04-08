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
  onClickDocument: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDelete: (path: string) => void;
  onMoveItem?: (sourcePath: string, targetFolderPath: string) => void;
}

export function FileTreeItem({
  entry,
  depth,
  isActive,
  isExpanded,
  onClickDocument,
  onToggleFolder,
  onRename,
  onDelete,
  onMoveItem,
}: FileTreeItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Drag-and-drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", entry.path);
      e.dataTransfer.effectAllowed = "move";
    },
    [entry.path]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isFolder) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    },
    [isFolder]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!isFolder || !onMoveItem) return;
      const sourcePath = e.dataTransfer.getData("text/plain");
      if (!sourcePath || sourcePath === entry.path) return;
      // Don't drop into itself or a child of itself
      if (sourcePath === entry.path || entry.path.startsWith(sourcePath + "/")) return;
      onMoveItem(sourcePath, entry.path);
    },
    [isFolder, entry.path, onMoveItem]
  );

  const contextItems = [
    { label: "Rename", onClick: startRename },
    { label: "Delete", danger: true, onClick: () => onDelete(entry.path) },
  ];

  return (
    <>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ paddingLeft: depth * 16 + 8 }}
        className={`flex items-center gap-1.5 h-7 pr-2 cursor-pointer rounded-md text-[13px] transition-colors group ${
          isActive
            ? "bg-[var(--accent-light)] text-[var(--accent-dark)]"
            : isDragOver
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
