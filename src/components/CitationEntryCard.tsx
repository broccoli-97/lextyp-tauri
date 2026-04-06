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
        "group rounded-lg border transition-all duration-150",
        compact ? "p-2.5" : "p-3",
        onClick ? "cursor-pointer" : "",
        active
          ? "border-[var(--accent)] bg-[var(--accent-light)] ring-1 ring-[var(--accent)]/10"
          : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`badge ${active ? 'badge-accent' : ''}`}>
              {entry.type}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
              @{entry.key}
            </span>
          </div>
          <p className="line-clamp-2 text-[12px] leading-[1.5] text-[var(--text-primary)]">
            {preview}
          </p>
          <p className="truncate text-[11px] text-[var(--text-secondary)]">{meta}</p>
        </div>

        {onInsert ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onInsert();
            }}
            className="shrink-0 btn btn-ghost h-6 px-2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Insert
          </button>
        ) : null}
      </div>
    </div>
  );
}
