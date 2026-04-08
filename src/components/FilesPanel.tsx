import { FolderPlus, FilePlus, FileDown, FileUp, FileCode } from "lucide-react";
import { FileTree } from "./FileTree";

interface FilesPanelProps {
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
}

export function FilesPanel({
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
}: FilesPanelProps) {
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
