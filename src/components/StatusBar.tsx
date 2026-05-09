import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/app-store";
import { useWorkspaceStore } from "../stores/workspace-store";
import { Circle, Loader2, AlertCircle, CheckCircle, Lightbulb, ArrowDownCircle, X } from "lucide-react";
import { useT } from "../lib/i18n";

const TIP_KEYS = [
  "tip.slash",
  "tip.citationStyle",
  "tip.pdfDoubleClick",
  "tip.collapsePanel",
  "tip.outline",
  "tip.darkMode",
  "tip.bold",
  "tip.bibImport",
] as const;

const TIP_INTERVAL = 15_000; // rotate every 15 seconds

export function StatusBar() {
  const t = useT();
  const compiling = useAppStore((s) => s.compiling);
  const lastError = useAppStore((s) => s.lastError);
  const lastDuration = useAppStore((s) => s.lastDuration);
  const updateInfo = useAppStore((s) => s.updateInfo);
  const updateDismissed = useAppStore((s) => s.updateDismissed);
  const setUpdateInfo = useAppStore((s) => s.setUpdateInfo);
  const dismissUpdate = useAppStore((s) => s.dismissUpdate);
  const cursorWordCount = useAppStore((s) => s.cursorWordCount);
  const totalWordCount = useAppStore((s) => s.totalWordCount);
  const activeDocumentPath = useWorkspaceStore((s) => s.activeDocumentPath);

  // --- Rotating tips ---
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIP_KEYS.length));

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIP_KEYS.length);
    }, TIP_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // --- Silent background update check ---
  useEffect(() => {
    let cancelled = false;
    invoke<{ has_update: boolean; latest_version: string; current_version: string; release_url: string }>("check_update")
      .then((info) => {
        if (!cancelled && info.has_update) {
          setUpdateInfo(info);
        }
      })
      .catch(() => {
        // Silent — don't bother the user if the check fails
      });
    return () => { cancelled = true; };
  }, [setUpdateInfo]);

  const statusConfig = compiling
    ? { icon: <Loader2 size={12} className="animate-spin" />, text: t("status.compiling"), color: "text-[var(--accent-dark)]", bg: "bg-[var(--accent-light)]" }
    : lastError
      ? { icon: <AlertCircle size={12} />, text: t("status.error"), color: "text-[var(--error)]", bg: "bg-[var(--error-light)]" }
      : lastDuration > 0
        ? { icon: <CheckCircle size={12} />, text: `${lastDuration}ms`, color: "text-[var(--success)]", bg: "bg-[var(--success-light)]" }
        : { icon: <Circle size={8} className="fill-current" />, text: t("status.ready"), color: "text-[var(--text-tertiary)]", bg: "" };

  const showUpdate = updateInfo?.has_update && !updateDismissed;

  return (
    <div className="h-8 border-t border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-[var(--bg-tertiary)]">
      {/* Left side - Status */}
      <div className="flex items-center gap-2 min-w-0">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full shrink-0 ${statusConfig.bg}`}>
          <span className={statusConfig.color}>{statusConfig.icon}</span>
          <span className={`text-[11px] font-medium ${statusConfig.color}`}>{statusConfig.text}</span>
        </div>

        {/* Tip */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <Lightbulb size={11} className="text-[var(--text-tertiary)] shrink-0" />
          <span className="text-[11px] text-[var(--text-tertiary)] truncate">
            {t(TIP_KEYS[tipIndex])}
          </span>
        </div>
      </div>

      {/* Right side - Word count + Update + App info (citation style chip lives in the editor toolbar) */}
      <div className="flex items-center gap-3 shrink-0">
        {activeDocumentPath && (
          <WordCountReadout
            cursor={cursorWordCount}
            total={totalWordCount}
            label={t("words.label")}
            title={t("words.tooltip")}
          />
        )}
        {showUpdate && (
          <div className="group flex items-center">
            <a
              href={updateInfo.release_url}
              target="_blank"
              rel="noopener noreferrer"
              title={t("update.available").replace("{version}", updateInfo.latest_version)}
              className="flex items-center px-1.5 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-dark)] hover:opacity-80 transition-opacity"
            >
              <ArrowDownCircle size={11} className="shrink-0" />
              <span className="overflow-hidden whitespace-nowrap text-[11px] font-medium max-w-0 group-hover:max-w-[260px] group-hover:ml-1 transition-[max-width,margin] duration-200 ease-out">
                {t("update.available").replace("{version}", updateInfo.latest_version)}
              </span>
            </a>
            <button
              onClick={dismissUpdate}
              title="Dismiss"
              aria-label="Dismiss update notice"
              className="overflow-hidden max-w-0 group-hover:max-w-[20px] group-hover:ml-1 transition-[max-width,margin] duration-200 ease-out text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              <X size={11} className="shrink-0" />
            </button>
          </div>
        )}
        <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
          LexTyp v{__APP_VERSION__}
        </span>
      </div>
    </div>
  );
}

function WordCountReadout({
  cursor,
  total,
  label,
  title,
}: {
  cursor: number | null;
  total: number;
  label: string;
  title: string;
}) {
  return (
    <div
      title={title}
      className="flex items-baseline gap-1 px-2 py-0.5 text-[11px] text-[var(--text-tertiary)] tabular-nums select-none"
    >
      {cursor !== null ? (
        <>
          <span className="text-[var(--text-secondary)] font-medium">{cursor}</span>
          <span className="opacity-60">/</span>
          <span>{total}</span>
        </>
      ) : (
        <span className="text-[var(--text-secondary)] font-medium">{total}</span>
      )}
      <span className="ml-1">{label}</span>
    </div>
  );
}
