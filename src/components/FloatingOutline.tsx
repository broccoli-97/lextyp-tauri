import { useState, useEffect, useRef, useCallback } from "react";
import { List } from "lucide-react";
import { useT } from "../lib/i18n";

interface OutlineEntry {
  id: string;
  text: string;
  level: number;
}

interface FloatingOutlineProps {
  editor: any;
}

export function FloatingOutline({ editor }: FloatingOutlineProps) {
  const t = useT();
  const [entries, setEntries] = useState<OutlineEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        setExpanded(false);
        setHoveredIndex(null);
      }}
      className={`absolute top-4 right-4 z-50 transition-all duration-200 ${
        expanded
          ? "w-52 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg"
          : "w-9 h-9 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg"
      }`}
    >
      {/* Collapsed state - icon only */}
      {!expanded && (
        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
          <List size={16} />
        </div>
      )}

      {/* Expanded state - full outline */}
      {expanded && (
        <div className="p-3 max-h-[50vh] overflow-auto animate-fade-in">
          <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-[var(--border-light)]">
            <List size={12} className="text-[var(--text-secondary)]" />
            <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
              {t("editor.outline")}
            </span>
          </div>
          <div className="space-y-0.5">
            {entries.map((entry, index) => (
              <button
                key={entry.id}
                onClick={() => {
                  const block = editor.getBlock(entry.id);
                  if (block) {
                    editor.setTextCursorPosition(block, "start");
                    // Scroll the DOM element into view
                    setTimeout(() => {
                      const el = document.querySelector(`[data-id="${entry.id}"]`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 50);
                  }
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`block w-full text-left py-1.5 px-2 rounded-md transition-all duration-150 truncate ${
                  hoveredIndex === index
                    ? "bg-[var(--accent-light)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
                style={{
                  paddingLeft: `${(entry.level - 1) * 12 + 8}px`,
                  fontSize: entry.level === 1 ? "12px" : "11px",
                  fontWeight: entry.level === 1 ? 500 : 400,
                }}
              >
                {entry.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
