import { useEffect, useRef } from "react";

interface MenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 9999,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="min-w-[120px] py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md shadow-lg animate-fade-in"
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors ${
            item.danger
              ? "text-[var(--error)] hover:bg-[var(--error-light)]"
              : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
