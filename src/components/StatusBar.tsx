import { useAppStore } from "../stores/app-store";

export function StatusBar() {
  const { compiling, lastError, lastDuration } = useAppStore();

  const statusColor = compiling ? "#2196F3" : lastError ? "#F44336" : "#4CAF50";
  const statusText = compiling
    ? "Compiling\u2026"
    : lastError
      ? "Error"
      : lastDuration > 0
        ? `Compiled in ${lastDuration}ms`
        : "Ready";

  return (
    <div className="h-[26px] bg-[#F5F5F5] border-t border-[#E0E0E0] flex items-center px-3 text-[11px] text-[#9E9E9E] shrink-0">
      <div className="flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span>{statusText}</span>
      </div>
    </div>
  );
}
