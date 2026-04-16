import { useState, useMemo, useCallback } from "react";
import {
  Save,
  Eye,
  Trash2,
  GitCompareArrows,
  Clock,
} from "lucide-react";
import { useVersionStore } from "../stores/version-store";
import { useWorkspaceStore } from "../stores/workspace-store";
import { useReviewStore } from "../stores/review-store";
import { useT } from "../lib/i18n";

export function HistoryPanel() {
  const t = useT();
  const versions = useVersionStore((s) => s.versions);
  const loading = useVersionStore((s) => s.loading);
  const viewingVersionId = useVersionStore((s) => s.viewingVersionId);
  const saveVersion = useVersionStore((s) => s.saveVersion);
  const viewVersion = useVersionStore((s) => s.viewVersion);
  const exitVersionView = useVersionStore((s) => s.exitVersionView);
  const deleteVersion = useVersionStore((s) => s.deleteVersion);
  const startDiff = useVersionStore((s) => s.startDiff);
  const diffMode = useVersionStore((s) => s.diffMode);

  const activeDocumentPath = useWorkspaceStore((s) => s.activeDocumentPath);
  const editorInstance = useWorkspaceStore((s) => s.editorInstance);
  const activeDocumentMeta = useWorkspaceStore((s) => s.activeDocumentMeta);
  const authorName = useReviewStore((s) => s.authorName);

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [versionDesc, setVersionDesc] = useState("");
  const [selectedForDiff, setSelectedForDiff] = useState<Set<number>>(new Set());

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.id - a.id),
    [versions]
  );

  const handleSaveVersion = useCallback(async () => {
    if (!activeDocumentPath || !editorInstance) return;
    const name = versionName.trim() || `Version ${versions.length + 1}`;
    const blocks = editorInstance.document;
    const documentJson = JSON.stringify(blocks);
    const meta = activeDocumentMeta || {
      title: "Untitled",
      citation_style: "oscola",
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };
    const metaJson = JSON.stringify(meta);

    await saveVersion(
      activeDocumentPath,
      name,
      versionDesc.trim(),
      authorName || "Anonymous",
      documentJson,
      metaJson
    );
    setShowSaveForm(false);
    setVersionName("");
    setVersionDesc("");
  }, [
    activeDocumentPath,
    editorInstance,
    versionName,
    versionDesc,
    authorName,
    versions.length,
    activeDocumentMeta,
    saveVersion,
  ]);

  const handleToggleDiffSelect = (id: number) => {
    setSelectedForDiff((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 2) {
          // Replace the oldest selection
          const arr = Array.from(next);
          next.delete(arr[0]);
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleCompare = () => {
    if (!activeDocumentPath || selectedForDiff.size !== 2) return;
    const ids = Array.from(selectedForDiff).sort((a, b) => a - b);
    startDiff(activeDocumentPath, ids[0], ids[1]);
  };

  const handleDelete = async (id: number) => {
    if (!activeDocumentPath) return;
    await deleteVersion(activeDocumentPath, id);
    setSelectedForDiff((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Save version button */}
      <div className="px-3 py-3 border-b border-[var(--border-light)]">
        {!showSaveForm ? (
          <button
            onClick={() => setShowSaveForm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] transition-colors"
            disabled={loading}
          >
            <Save size={14} />
            {t("history.saveVersion")}
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder={t("history.namePlaceholder")}
              className="w-full px-2 py-1.5 text-[12px] rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveVersion();
                if (e.key === "Escape") setShowSaveForm(false);
              }}
            />
            <textarea
              value={versionDesc}
              onChange={(e) => setVersionDesc(e.target.value)}
              placeholder={t("history.descPlaceholder")}
              rows={2}
              className="w-full px-2 py-1.5 text-[12px] rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleSaveVersion}
                className="flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] transition-colors"
                disabled={loading}
              >
                {t("history.save")}
              </button>
              <button
                onClick={() => setShowSaveForm(false)}
                className="flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                {t("history.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diff compare bar */}
      {selectedForDiff.size === 2 && !diffMode && (
        <div className="px-3 py-2 border-b border-[var(--border-light)] bg-[var(--bg-tertiary)]">
          <button
            onClick={handleCompare}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <GitCompareArrows size={13} />
            {t("history.compare")}
          </button>
        </div>
      )}

      {/* Viewing banner */}
      {viewingVersionId !== null && (
        <div className="px-3 py-2 border-b border-[var(--border-light)] bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 truncate">
              {t("history.viewing")}{" "}
              {versions.find((v) => v.id === viewingVersionId)?.name}
            </span>
            <button
              onClick={exitVersionView}
              className="text-[11px] text-[var(--accent)] hover:underline shrink-0 ml-2"
            >
              {t("history.backToCurrent")}
            </button>
          </div>
        </div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-auto">
        {sortedVersions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
              <Clock size={20} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-[12px] font-medium text-[var(--text-secondary)] text-center">
              {t("history.noVersions")}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] text-center">
              {t("history.noVersionsHint")}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {sortedVersions.map((version) => (
              <div
                key={version.id}
                className={`mx-2 my-1 px-2.5 py-2 rounded-lg border transition-colors ${
                  viewingVersionId === version.id
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                    : selectedForDiff.has(version.id)
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-transparent hover:bg-[var(--bg-hover)]"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                    {version.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] shrink-0 ml-2">
                    {formatRelativeTime(version.created_at)}
                  </span>
                </div>
                {version.description && (
                  <p className="text-[11px] text-[var(--text-tertiary)] mb-1 break-words">
                    {version.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {version.author} &middot; {version.block_count}{" "}
                    {t("history.blocks")}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleToggleDiffSelect(version.id)}
                      className={`icon-btn w-6 h-6 ${
                        selectedForDiff.has(version.id)
                          ? "text-blue-600"
                          : "text-[var(--text-tertiary)] hover:text-blue-600"
                      }`}
                      title={t("history.compare")}
                    >
                      <GitCompareArrows size={12} />
                    </button>
                    <button
                      onClick={() =>
                        activeDocumentPath &&
                        viewVersion(activeDocumentPath, version.id)
                      }
                      className="icon-btn w-6 h-6 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      title={t("history.view")}
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(version.id)}
                      className="icon-btn w-6 h-6 text-[var(--text-tertiary)] hover:text-red-500"
                      title={t("history.delete")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
