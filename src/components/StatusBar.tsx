import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/app-store";
import { useReferenceStore } from "../stores/reference-store";
import { useWorkspaceStore } from "../stores/workspace-store";
import { getOrderedStyleNames, PRIMARY_STYLES } from "../lib/citation/registry";
import { Circle, Loader2, AlertCircle, CheckCircle, Lightbulb, ArrowDownCircle, X, BookMarked, Check } from "lucide-react";
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
    ? { icon: <Loader2 size={12} className="animate-spin" />, text: t("status.compiling"), color: "text-[var(--accent)]", bg: "bg-[var(--accent-light)]" }
    : lastError
      ? { icon: <AlertCircle size={12} />, text: t("status.error"), color: "text-[var(--error)]", bg: "bg-[var(--error-light)]" }
      : lastDuration > 0
        ? { icon: <CheckCircle size={12} />, text: `${lastDuration}ms`, color: "text-[var(--success)]", bg: "bg-[var(--success-light)]" }
        : { icon: <Circle size={8} className="fill-current" />, text: t("status.ready"), color: "text-[var(--text-tertiary)]", bg: "" };

  const showUpdate = updateInfo?.has_update && !updateDismissed;

  return (
    <div className="h-8 border-t border-[var(--border-light)] flex items-center justify-between px-4 shrink-0 bg-[var(--bg-secondary)]">
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

      {/* Right side - Style + Update + App info */}
      <div className="flex items-center gap-3 shrink-0">
        <StyleChip />
        {showUpdate && (
          <div className="group flex items-center">
            <a
              href={updateInfo.release_url}
              target="_blank"
              rel="noopener noreferrer"
              title={t("update.available").replace("{version}", updateInfo.latest_version)}
              className="flex items-center px-1.5 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] hover:opacity-80 transition-opacity"
            >
              <ArrowDownCircle size={11} className="shrink-0" />
              <span className="overflow-hidden whitespace-nowrap text-[10px] font-medium max-w-0 group-hover:max-w-[260px] group-hover:ml-1 transition-[max-width,margin] duration-200 ease-out">
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
        <span className="text-[10px] text-[var(--text-tertiary)]">
          LexTyp v{__APP_VERSION__}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact citation-style indicator that lives in the status bar so the active
 * convention (OSCOLA / Harvard / …) is visible while writing — not buried in
 * the References tab. Click to switch styles inline.
 */
function StyleChip() {
  const activeDocumentPath = useWorkspaceStore((s) => s.activeDocumentPath);
  const citationStyle = useReferenceStore((s) => s.citationStyle);
  const setCitationStyle = useReferenceStore((s) => s.setCitationStyle);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const menuWidth = 160;
    setPos({
      top: r.top - 4, // anchored to bottom edge of menu via translateY(-100%)
      left: Math.max(8, r.right - menuWidth),
    });
  }, [open]);

  if (!activeDocumentPath) return null;

  const ordered = getOrderedStyleNames();
  const dividerAfter = PRIMARY_STYLES.length;

  return (
    <>
      <button
        ref={anchorRef}
        onClick={() => setOpen((o) => !o)}
        title="Citation style"
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      >
        <BookMarked size={11} />
        <span className="text-[10px] font-semibold tracking-wide">
          {citationStyle.toUpperCase()}
        </span>
      </button>

      {open && pos && createPortal(
        <div
          ref={portalRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translateY(-100%)",
            zIndex: 9999,
          }}
          className="menu-surface w-[160px] py-1 animate-fade-in"
        >
          {ordered.map((s, i) => {
            const active = s === citationStyle;
            return (
              <div key={s}>
                {i === dividerAfter && (
                  <div className="my-0.5 border-t border-[var(--border-light)]" />
                )}
                <button
                  onClick={() => {
                    setCitationStyle(s);
                    setOpen(false);
                  }}
                  className={`menu-item justify-between ${active ? "text-[var(--accent-dark)] bg-[var(--accent-light)]" : ""}`}
                >
                  <span className="font-semibold tracking-wide">{s.toUpperCase()}</span>
                  {active && <Check size={12} className="shrink-0" />}
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
