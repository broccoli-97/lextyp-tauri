import { useCallback } from "react";
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
  const closeDocument = useWorkspaceStore((s) => s.closeDocument);

  const handleRename = useCallback(
    (oldPath: string, newName: string) => {
      // Build new path: same parent dir + new name (preserve extension for documents)
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
    <div className="py-1">
      <FileTreeLevel
        entries={fileTree}
        depth={0}
        expandedFolders={expandedFolders}
        activeDocumentPath={activeDocumentPath}
        onClickDocument={openDocument}
        onToggleFolder={toggleFolder}
        onRename={handleRename}
        onDelete={handleDelete}
        onClose={closeDocument}
      />
    </div>
  );
}

function FileTreeLevel({
  entries,
  depth,
  expandedFolders,
  activeDocumentPath,
  onClickDocument,
  onToggleFolder,
  onRename,
  onDelete,
  onClose,
}: {
  entries: FileTreeEntry[];
  depth: number;
  expandedFolders: Set<string>;
  activeDocumentPath: string | null;
  onClickDocument: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDelete: (path: string) => void;
  onClose: () => void;
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
              onClickDocument={onClickDocument}
              onToggleFolder={onToggleFolder}
              onRename={onRename}
              onDelete={onDelete}
              onClose={onClose}
            />
            {entry.kind === "folder" && isExpanded && entry.children.length > 0 && (
              <FileTreeLevel
                entries={entry.children}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                activeDocumentPath={activeDocumentPath}
                onClickDocument={onClickDocument}
                onToggleFolder={onToggleFolder}
                onRename={onRename}
                onDelete={onDelete}
                onClose={onClose}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
