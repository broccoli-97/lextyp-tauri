import { useAppStore } from "../stores/app-store";
import { Circle, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useT } from "../lib/i18n";

export function StatusBar() {
  const t = useT();
  const compiling = useAppStore((s) => s.compiling);
  const lastError = useAppStore((s) => s.lastError);
  const lastDuration = useAppStore((s) => s.lastDuration);

  const statusConfig = compiling
    ? { icon: <Loader2 size={12} className="animate-spin" />, text: t("status.compiling"), color: "text-[var(--accent)]", bg: "bg-[var(--accent-light)]" }
    : lastError
      ? { icon: <AlertCircle size={12} />, text: t("status.error"), color: "text-[var(--error)]", bg: "bg-[var(--error-light)]" }
      : lastDuration > 0
        ? { icon: <CheckCircle size={12} />, text: `${lastDuration}ms`, color: "text-[var(--success)]", bg: "bg-[var(--success-light)]" }
        : { icon: <Circle size={8} className="fill-current" />, text: t("status.ready"), color: "text-[var(--text-tertiary)]", bg: "" };

  return (
    <div className="h-8 border-t border-[var(--border-light)] flex items-center justify-between px-4 shrink-0 bg-[var(--bg-secondary)]">
      {/* Left side - Status */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusConfig.bg}`}>
          <span className={statusConfig.color}>{statusConfig.icon}</span>
          <span className={`text-[11px] font-medium ${statusConfig.color}`}>{statusConfig.text}</span>
        </div>
      </div>

      {/* Right side - App info */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-[var(--text-tertiary)]">
          LexTyp v{__APP_VERSION__}
        </span>
      </div>
    </div>
  );
}
