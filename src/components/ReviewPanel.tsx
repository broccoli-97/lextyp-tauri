import { useMemo } from "react";
import {
  MessageSquare,
  Check,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useReviewStore } from "../stores/review-store";
import { useT } from "../lib/i18n";

export function ReviewPanel() {
  const t = useT();
  const reviewMode = useReviewStore((s) => s.reviewMode);
  const setReviewMode = useReviewStore((s) => s.setReviewMode);
  const comments = useReviewStore((s) => s.comments);
  const authorName = useReviewStore((s) => s.authorName);
  const setAuthorName = useReviewStore((s) => s.setAuthorName);
  const selectedCommentId = useReviewStore((s) => s.selectedCommentId);
  const setSelectedComment = useReviewStore((s) => s.setSelectedComment);
  const resolveComment = useReviewStore((s) => s.resolveComment);
  const unresolveComment = useReviewStore((s) => s.unresolveComment);
  const deleteComment = useReviewStore((s) => s.deleteComment);

  const unresolvedCount = useMemo(
    () => comments.filter((c) => !c.resolved).length,
    [comments]
  );

  const sortedComments = useMemo(
    () =>
      [...comments].sort((a, b) => {
        // Unresolved first, then by creation time
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [comments]
  );

  const handleCommentClick = (id: string, blockId: string) => {
    setSelectedComment(id);
    // Jump to the block in the editor
    const jumpFn = (window as any).__lextyp_jumpToBlock;
    if (jumpFn) jumpFn(blockId, 0);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Review mode toggle + author */}
      <div className="px-3 py-3 space-y-2.5 border-b border-[var(--border-light)]">
        <button
          onClick={() => setReviewMode(!reviewMode)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
            reviewMode
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          {reviewMode ? <EyeOff size={14} /> : <Eye size={14} />}
          {reviewMode ? t("review.disable") : t("review.enable")}
        </button>

        <div>
          <label className="panel-section-label mb-1 block">
            {t("review.authorName")}
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder={t("review.authorPlaceholder")}
            className="w-full px-2 py-1.5 text-[12px] rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-auto">
        {sortedComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
              <MessageSquare
                size={20}
                className="text-[var(--text-tertiary)]"
              />
            </div>
            <p className="text-[12px] font-medium text-[var(--text-secondary)] text-center">
              {t("review.noComments")}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] text-center">
              {t("review.noCommentsHint")}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {sortedComments.map((comment) => (
              <div
                key={comment.id}
                onClick={() =>
                  handleCommentClick(comment.id, comment.blockId)
                }
                className={`mx-2 my-1 px-2.5 py-2 rounded-lg cursor-pointer transition-colors border ${
                  selectedCommentId === comment.id
                    ? "border-[var(--accent)] bg-[var(--accent-light)]"
                    : "border-transparent hover:bg-[var(--bg-hover)]"
                } ${comment.resolved ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                    {comment.author}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] shrink-0 ml-2">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed break-words">
                  {comment.text}
                </p>
                {comment.resolved && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                    <Check size={10} />
                    {t("review.resolved")}
                  </span>
                )}
                <div className="flex items-center gap-1 mt-1.5">
                  {comment.resolved ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        unresolveComment(comment.id);
                      }}
                      className="icon-btn w-6 h-6 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      title={t("review.unresolve")}
                    >
                      <RotateCcw size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveComment(comment.id);
                      }}
                      className="icon-btn w-6 h-6 text-[var(--text-tertiary)] hover:text-green-600"
                      title={t("review.resolve")}
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteComment(comment.id);
                    }}
                    className="icon-btn w-6 h-6 text-[var(--text-tertiary)] hover:text-red-500"
                    title={t("review.delete")}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {comments.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-t border-[var(--border-light)] text-[11px] text-[var(--text-tertiary)]">
          {comments.length} {t("review.comments")}
          {unresolvedCount > 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
              {unresolvedCount} {t("review.unresolved")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d`;
  return new Date(isoDate).toLocaleDateString();
}
