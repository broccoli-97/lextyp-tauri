import { useState, useEffect, useRef, useCallback } from "react";

interface OutlineEntry {
  id: string;
  text: string;
  level: number;
}

interface FloatingOutlineProps {
  editor: any; // BlockNote editor instance
}

export function FloatingOutline({ editor }: FloatingOutlineProps) {
  const [entries, setEntries] = useState<OutlineEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rebuild = useCallback(() => {
    if (!editor) return;
    const blocks = editor.document;
    const result: OutlineEntry[] = [];
    for (const block of blocks) {
      if (block.type === "heading") {
        const text = block.content
          ?.filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("") || "";
        if (text.trim()) {
          result.push({
            id: block.id,
            text,
            level: block.props?.level ?? 1,
          });
        }
      }
    }
    setEntries(result);
  }, [editor]);

  useEffect(() => {
    // Rebuild on mount and periodically when editor changes
    rebuild();
    const interval = setInterval(rebuild, 1000);
    return () => clearInterval(interval);
  }, [rebuild]);

  // Also rebuild on editor change via subscription
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
    <div className="absolute top-4 right-2 w-40 max-h-[60%] rounded-lg bg-[#F8F8F8]/60 hover:bg-[#F8F8F8]/95 border border-[#E8E8E8] z-50 transition-all duration-200 overflow-hidden">
      <div className="p-3 overflow-auto max-h-full">
        <div className="text-[10px] font-bold uppercase text-[#9E9E9E] mb-1.5 tracking-wide">
          Outline
        </div>
        <div className="space-y-0.5">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => {
                const block = editor.getBlock(entry.id);
                if (block) editor.setTextCursorPosition(block, "start");
              }}
              className="block w-full text-left text-[11px] text-[#616161] hover:text-[#1565C0] truncate transition-colors"
              style={{ paddingLeft: `${(entry.level - 1) * 10}px` }}
            >
              {entry.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
