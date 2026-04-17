import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search, X } from "lucide-react";
import type { FileTreeEntry } from "../types/workspace";

interface DocumentPickerProps {
  open: boolean;
  fileTree: FileTreeEntry[];
  workspacePath: string | null;
  currentDocumentPath: string | null;
  onClose: () => void;
  onSelect: (path: string, title: string) => void;
}

interface FlatDoc {
  path: string;
  title: string;
  name: string;
  /** Path relative to the workspace root (display only). */
  relativePath: string;
  /** Folder depth — used to indent rows in the list. */
  depth: number;
}

function flattenTree(
  entries: FileTreeEntry[],
  workspacePath: string | null,
  depth = 0,
  acc: FlatDoc[] = []
): FlatDoc[] {
  for (const entry of entries) {
    if (entry.kind === "folder") {
      flattenTree(entry.children, workspacePath, depth + 1, acc);
      continue;
    }
    const norm = entry.path.replace(/\\/g, "/");
    const root = workspacePath ? workspacePath.replace(/\\/g, "/") + "/" : "";
    const relativePath = root && norm.startsWith(root) ? norm.slice(root.length) : norm;
    acc.push({
      path: entry.path,
      title: entry.title || entry.name.replace(/\.lextyp$/, ""),
      name: entry.name,
      relativePath,
      depth,
    });
  }
  return acc;
}

export function DocumentPicker({
  open,
  fileTree,
  workspacePath,
  currentDocumentPath,
  onClose,
  onSelect,
}: DocumentPickerProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const docs = useMemo(() => {
    const all = flattenTree(fileTree, workspacePath);
    return currentDocumentPath
      ? all.filter((d) => d.path !== currentDocumentPath)
      : all;
  }, [fileTree, workspacePath, currentDocumentPath]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.relativePath.toLowerCase().includes(q)
    );
  }, [docs, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        const target = filtered[activeIndex];
        onSelect(target.path, target.title);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, filtered, onClose, onSelect, open]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center bg-black/20 backdrop-blur-sm px-6 pt-20 animate-fade-in">
      <div className="w-full max-w-[640px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl animate-slide-in">
        <div className="flex items-center gap-3 border-b border-[var(--border-light)] px-4 py-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents by title or path..."
              className="input h-10 pl-10 text-[13px]"
            />
          </div>
          <button onClick={onClose} className="icon-btn w-9 h-9" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-2 text-[11px] text-[var(--text-tertiary)]">
          <span className="font-medium">{filtered.length} documents</span>
          <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[10px]">
            Enter to include
          </span>
        </div>

        <div className="max-h-[420px] overflow-auto p-2">
          {filtered.length === 0 ? (
            <div className="card py-10 text-center border-dashed">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                No documents to include
              </p>
              <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                {docs.length === 0
                  ? "Create another .lextyp document in this workspace first"
                  : "Refine your search terms"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((doc, index) => (
                <button
                  key={doc.path}
                  onClick={() => onSelect(doc.path, doc.title)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                    index === activeIndex
                      ? "bg-[var(--bg-tertiary)]"
                      : "hover:bg-[var(--bg-secondary)]"
                  }`}
                  style={{ paddingLeft: `${10 + doc.depth * 12}px` }}
                >
                  <FileText
                    size={14}
                    className="shrink-0 text-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                      {doc.title}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">
                      {doc.relativePath}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
