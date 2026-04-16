import { X } from "lucide-react";
import { useVersionStore } from "../stores/version-store";
import { useT } from "../lib/i18n";
import type { DiffEntry, TextDiffSegment } from "../lib/block-diff";

export function VersionDiffView() {
  const t = useT();
  const diffResult = useVersionStore((s) => s.diffResult);
  const diffBaseId = useVersionStore((s) => s.diffBaseId);
  const diffTargetId = useVersionStore((s) => s.diffTargetId);
  const versions = useVersionStore((s) => s.versions);
  const exitDiff = useVersionStore((s) => s.exitDiff);

  const baseName =
    versions.find((v) => v.id === diffBaseId)?.name ?? `#${diffBaseId}`;
  const targetName =
    versions.find((v) => v.id === diffTargetId)?.name ?? `#${diffTargetId}`;

  if (!diffResult) return null;

  const stats = {
    added: diffResult.filter((d) => d.type === "added").length,
    removed: diffResult.filter((d) => d.type === "removed").length,
    modified: diffResult.filter((d) => d.type === "modified").length,
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            {t("history.diffTitle")}
          </span>
          <span className="text-[12px] text-[var(--text-tertiary)]">
            {baseName} &rarr; {targetName}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <DiffStats stats={stats} />
          <button
            onClick={exitDiff}
            className="icon-btn w-7 h-7 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            title={t("history.closeDiff")}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-[800px] mx-auto space-y-1">
          {diffResult.map((entry) => (
            <DiffBlock key={entry.blockId} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DiffStats({
  stats,
}: {
  stats: { added: number; removed: number; modified: number };
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium">
      {stats.added > 0 && (
        <span className="text-green-600 dark:text-green-400">
          +{stats.added} {t("history.added")}
        </span>
      )}
      {stats.removed > 0 && (
        <span className="text-red-600 dark:text-red-400">
          -{stats.removed} {t("history.removed")}
        </span>
      )}
      {stats.modified > 0 && (
        <span className="text-amber-600 dark:text-amber-400">
          ~{stats.modified} {t("history.modified")}
        </span>
      )}
    </div>
  );
}

function DiffBlock({ entry }: { entry: DiffEntry }) {
  const block = entry.newBlock ?? entry.oldBlock;
  const blockType = block?.type ?? "paragraph";
  const isHeading = blockType === "heading";
  const level = block?.props?.level ?? 1;

  const baseClasses =
    "px-4 py-2 rounded-md text-[14px] leading-relaxed font-[var(--font-editor)]";

  if (entry.type === "unchanged") {
    return (
      <div className={`${baseClasses} text-[var(--text-secondary)] opacity-50`}>
        {isHeading && <HeadingPrefix level={level} />}
        {extractText(block)}
      </div>
    );
  }

  if (entry.type === "added") {
    return (
      <div
        className={`${baseClasses} bg-green-50 dark:bg-green-900/20 border-l-3 border-green-500 text-[var(--text-primary)]`}
      >
        {isHeading && <HeadingPrefix level={level} />}
        {extractText(block)}
      </div>
    );
  }

  if (entry.type === "removed") {
    return (
      <div
        className={`${baseClasses} bg-red-50 dark:bg-red-900/20 border-l-3 border-red-500 text-[var(--text-secondary)] line-through`}
      >
        {isHeading && <HeadingPrefix level={level} />}
        {extractText(block)}
      </div>
    );
  }

  // Modified -- show inline word diff
  return (
    <div
      className={`${baseClasses} bg-amber-50 dark:bg-amber-900/15 border-l-3 border-amber-500`}
    >
      {isHeading && <HeadingPrefix level={level} />}
      {entry.textDiff ? (
        <InlineTextDiff segments={entry.textDiff} />
      ) : (
        extractText(entry.newBlock)
      )}
    </div>
  );
}

function HeadingPrefix({ level }: { level: number }) {
  return (
    <span className="text-[var(--text-tertiary)] mr-1 font-bold">
      {"#".repeat(level)}{" "}
    </span>
  );
}

function InlineTextDiff({ segments }: { segments: TextDiffSegment[] }) {
  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "equal") {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === "added") {
          return (
            <span
              key={i}
              className="bg-green-200 dark:bg-green-800/50 text-green-900 dark:text-green-200 rounded-sm px-0.5"
            >
              {seg.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-200 rounded-sm px-0.5 line-through"
          >
            {seg.text}
          </span>
        );
      })}
    </span>
  );
}

function extractText(block: any): string {
  if (!block?.content || !Array.isArray(block.content)) return "";
  return block.content
    .map((item: any) => {
      if (item.type === "text") return item.text ?? "";
      if (item.type === "citation") return `@${item.props?.key ?? ""}`;
      return "";
    })
    .join("");
}
