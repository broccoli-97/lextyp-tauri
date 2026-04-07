import type { BibEntry } from "../types/bib";

interface CitationEntryCardProps {
  entry: BibEntry;
  preview: string;
  meta: string;
  active?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onInsert?: () => void;
}

export function CitationEntryCard({
  entry,
  preview,
  meta,
  active = false,
  compact = false,
  onClick,
  onInsert,
}: CitationEntryCardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        "group rounded-md border transition-all duration-150",
        compact ? "px-2 py-1.5" : "p-2.5",
        onClick ? "cursor-pointer" : "",
        active
          ? "border-[var(--accent)] bg-[var(--accent-light)] ring-1 ring-[var(--accent)]/10"
          : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`badge shrink-0 ${active ? "badge-accent" : ""}`}>
          {entry.type}
        </span>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)] truncate">
          @{entry.key}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-[1.4] text-[var(--text-primary)] break-words">
        {preview}
      </p>
      {meta && (
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">{meta}</p>
      )}
      {onInsert && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onInsert();
          }}
          className="mt-1 w-full btn btn-ghost h-5 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity border border-[var(--border)]"
        >
          Insert
        </button>
      )}
    </div>
  );
}
