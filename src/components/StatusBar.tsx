import { useAppStore } from "../stores/app-store";
import { Circle, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export function StatusBar() {
  const { compiling, lastError, lastDuration } = useAppStore();

  const statusConfig = compiling
    ? { icon: <Loader2 size={12} className="animate-spin" />, text: "Compiling...", color: "text-[var(--accent)]", bg: "bg-[var(--accent-light)]" }
    : lastError
      ? { icon: <AlertCircle size={12} />, text: "Error", color: "text-[var(--error)]", bg: "bg-[var(--error-light)]" }
      : lastDuration > 0
        ? { icon: <CheckCircle size={12} />, text: `${lastDuration}ms`, color: "text-[var(--success)]", bg: "bg-[var(--success-light)]" }
        : { icon: <Circle size={8} className="fill-current" />, text: "Ready", color: "text-[var(--text-tertiary)]", bg: "" };

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
          LexTyp v0.1.0
        </span>
      </div>
    </div>
  );
}
