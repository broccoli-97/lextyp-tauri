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
        "group rounded-xl border transition-all",
        compact ? "p-3" : "p-3.5",
        onClick ? "cursor-pointer" : "",
        active
          ? "border-[var(--accent)] bg-[var(--accent-light)]/60 shadow-[0_0_0_1px_rgba(35,131,226,0.08)]"
          : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--hover)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              {entry.type}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
              @{entry.key}
            </span>
          </div>
          <p className="line-clamp-3 text-[12px] leading-[1.45] text-[var(--text-primary)]">
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
            className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Insert
          </button>
        ) : null}
      </div>
    </div>
  );
}
