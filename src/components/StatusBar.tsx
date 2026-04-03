import { useAppStore } from "../stores/app-store";

export function StatusBar() {
  const { compiling, lastError, lastDuration } = useAppStore();

  const statusText = compiling
    ? "Compiling..."
    : lastError
      ? "Error"
      : lastDuration > 0
        ? `${lastDuration}ms`
        : "Ready";

  return (
    <div className="h-7 border-t border-[var(--border)] flex items-center justify-between px-4 shrink-0 bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            compiling
              ? "bg-[var(--accent)] animate-pulse"
              : lastError
                ? "bg-red-500"
                : "bg-emerald-500"
          }`}
        />
        <span className="text-[11px] text-[var(--text-tertiary)]">{statusText}</span>
      </div>
    </div>
  );
}
