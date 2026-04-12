import { FolderPlus, FilePlus, FileDown, FileUp, FileCode } from "lucide-react";
import { FileTree } from "./FileTree";
import { useT } from "../lib/i18n";

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
  const t = useT();

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
              className="inline-name-input flex-1"
            />
          </div>
        )}
        <FileTree />
      </div>

      {activeDocumentPath && (
        <div className="shrink-0 border-t border-[var(--border-light)] px-2 py-1.5 space-y-0.5">
          <div className="panel-section-label px-2 py-0.5">
            Document
          </div>
          <SidebarItem
            icon={<FileDown size={14} />}
            label={t("files.saveAs")}
            onClick={() => saveAs().catch(console.error)}
          />
          <SidebarItem
            icon={<FileUp size={14} />}
            label={t("sidebar.openFile")}
            onClick={() => openFile().catch(console.error)}
          />
          <SidebarItem
            icon={<FileCode size={14} />}
            label={t("files.export")}
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
      className="sidebar-row-btn"
    >
      <span className="sidebar-row-icon">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
