import { useState, useEffect, useRef, useCallback } from "react";
import { List } from "lucide-react";

interface OutlineEntry {
  id: string;
  text: string;
  level: number;
}

interface FloatingOutlineProps {
  editor: any;
}

export function FloatingOutline({ editor }: FloatingOutlineProps) {
  const [entries, setEntries] = useState<OutlineEntry[]>([]);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rebuild = useCallback(() => {
    if (!editor) return;
    const blocks = editor.document;
    const result: OutlineEntry[] = [];
    for (const block of blocks) {
      if (block.type === "heading") {
        const text =
          block.content
            ?.filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("") || "";
        if (text.trim()) {
          result.push({ id: block.id, text, level: block.props?.level ?? 1 });
        }
      }
    }
    setEntries(result);
  }, [editor]);

  useEffect(() => {
    rebuild();
    const interval = setInterval(rebuild, 1000);
    return () => clearInterval(interval);
  }, [rebuild]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(rebuild, 200);
    };
    editor.onChange(handler);
  }, [editor, rebuild]);

  if (entries.length === 0) return null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`absolute top-5 right-4 w-44 max-h-[55%] rounded-lg border border-[var(--border)] z-50 transition-all duration-300 overflow-hidden backdrop-blur-sm ${
        hovered ? "bg-white/95 shadow-lg" : "bg-white/50"
      }`}
    >
      <div className="p-3 overflow-auto max-h-full">
        <div className="flex items-center gap-1.5 mb-2">
          <List size={12} className="text-[var(--text-tertiary)]" />
          <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)] tracking-wider">
            On this page
          </span>
        </div>
        <div className="space-y-px">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => {
                const block = editor.getBlock(entry.id);
                if (block) editor.setTextCursorPosition(block, "start");
              }}
              className={`block w-full text-left py-1 rounded transition-colors truncate ${
                hovered
                  ? "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
                  : "text-[var(--text-tertiary)]"
              }`}
              style={{
                paddingLeft: `${(entry.level - 1) * 12 + 4}px`,
                fontSize: entry.level === 1 ? "12px" : "11px",
                fontWeight: entry.level === 1 ? 500 : 400,
              }}
            >
              {entry.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
