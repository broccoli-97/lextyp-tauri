import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  BookMarked,
  Check,
  ChevronDown,
  Italic,
  List,
  ListOrdered,
  Quote,
  Superscript,
  Type,
  Underline,
} from "lucide-react";
import type { BlockNoteEditor } from "@blocknote/core";
import { useEditorChange, useEditorSelectionChange } from "@blocknote/react";
import { useReferenceStore } from "../stores/reference-store";
import { getOrderedStyleNames, PRIMARY_STYLES } from "../lib/citation/registry";

interface EditorTopToolbarProps {
  editor: BlockNoteEditor<any, any, any>;
  onInsertCitation: () => void;
}

type BlockType =
  | "paragraph"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "bullet"
  | "numbered";

// Edition suffix shown in the citation-style chip. The chip drops the suffix
// at narrow widths via CSS (`.editor-toolbar-style-edn` is hidden under a
// media query) so the toolbar never wraps or distorts.
const STYLE_EDITION: Record<string, string> = {
  oscola: "4th edn",
  apa: "7th edn",
  chicago: "17th edn",
  harvard: "",
  ieee: "",
  plain: "",
};

function readBlockType(editor: BlockNoteEditor<any, any, any>): BlockType {
  try {
    const block = editor.getTextCursorPosition().block;
    if (!block) return "paragraph";
    if (block.type === "heading") {
      const lvl = (block.props as any)?.level ?? 1;
      if (lvl === 2) return "heading-2";
      if (lvl === 3) return "heading-3";
      return "heading-1";
    }
    if (block.type === "bulletListItem") return "bullet";
    if (block.type === "numberedListItem") return "numbered";
    return "paragraph";
  } catch {
    return "paragraph";
  }
}

function readActiveStyles(editor: BlockNoteEditor<any, any, any>) {
  try {
    return editor.getActiveStyles() as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export function EditorTopToolbar({ editor, onInsertCitation }: EditorTopToolbarProps) {
  const [blockType, setBlockType] = useState<BlockType>(() => readBlockType(editor));
  const [styles, setStyles] = useState<Record<string, unknown>>(() => readActiveStyles(editor));

  useEditorChange(() => {
    setBlockType(readBlockType(editor));
    setStyles(readActiveStyles(editor));
  }, editor);

  useEditorSelectionChange(() => {
    setBlockType(readBlockType(editor));
    setStyles(readActiveStyles(editor));
  }, editor);

  function focus() {
    try { editor.focus(); } catch { /* noop */ }
  }

  function setHeading(level: 1 | 2 | 3) {
    const block = editor.getTextCursorPosition().block;
    if (!block) return;
    const isSame = blockType === `heading-${level}`;
    editor.updateBlock(block, isSame
      ? { type: "paragraph", props: {} as any }
      : { type: "heading", props: { level } as any });
    focus();
  }

  function setList(kind: "bullet" | "numbered") {
    const block = editor.getTextCursorPosition().block;
    if (!block) return;
    const target = kind === "bullet" ? "bulletListItem" : "numberedListItem";
    const isSame = blockType === kind;
    editor.updateBlock(block, isSame
      ? { type: "paragraph", props: {} as any }
      : { type: target, props: {} as any });
    focus();
  }

  function toggle(style: "bold" | "italic" | "underline") {
    editor.toggleStyles({ [style]: true } as any);
    focus();
  }

  const isBold = !!styles.bold;
  const isItalic = !!styles.italic;
  const isUnderline = !!styles.underline;

  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-inner">
        <div className="editor-toolbar-group">
          {/* Headings only — clicking an already-active heading button
              demotes the block back to a paragraph (see setHeading below),
              so a dedicated Pilcrow paragraph button is redundant. */}
          <ToolbarTextBtn
            label="Heading 1"
            active={blockType === "heading-1"}
            onClick={() => setHeading(1)}
          >
            H1
          </ToolbarTextBtn>
          <ToolbarTextBtn
            label="Heading 2"
            active={blockType === "heading-2"}
            onClick={() => setHeading(2)}
          >
            H2
          </ToolbarTextBtn>
        </div>

        <div className="editor-toolbar-divider" aria-hidden="true" />

        <div className="editor-toolbar-group">
          <ToolbarBtn label="Bold" active={isBold} onClick={() => toggle("bold")}>
            <Bold size={14} />
          </ToolbarBtn>
          <ToolbarBtn label="Italic" active={isItalic} onClick={() => toggle("italic")}>
            <Italic size={14} />
          </ToolbarBtn>
          <ToolbarBtn label="Underline" active={isUnderline} onClick={() => toggle("underline")}>
            <Underline size={14} />
          </ToolbarBtn>
        </div>

        <div className="editor-toolbar-divider" aria-hidden="true" />

        <div className="editor-toolbar-group">
          <ToolbarBtn
            label="Bullet list"
            active={blockType === "bullet"}
            onClick={() => setList("bullet")}
          >
            <List size={14} />
          </ToolbarBtn>
          <ToolbarBtn
            label="Numbered list"
            active={blockType === "numbered"}
            onClick={() => setList("numbered")}
          >
            <ListOrdered size={14} />
          </ToolbarBtn>
        </div>

        <div className="editor-toolbar-divider" aria-hidden="true" />

        <ToolbarBtn
          label="Insert citation (/)"
          onClick={onInsertCitation}
        >
          <BookMarked size={14} />
        </ToolbarBtn>

        {/* StyleChip carries the citation-style picker AND the chip /
            footnote display toggle — they're conceptually one menu (how
            citations render). The earlier Eye / EyeOff button has moved
            inside the chip's dropdown. */}
        <StyleChip />
      </div>
    </div>
  );
}


interface BtnProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarBtn({ label, active, onClick, children }: BtnProps) {
  return (
    <button
      type="button"
      className={`editor-toolbar-btn ${active ? "is-active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarTextBtn({ label, active, onClick, children }: BtnProps) {
  return (
    <button
      type="button"
      className={`editor-toolbar-btn editor-toolbar-btn-text ${active ? "is-active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Citation-style chip — moved here from the bottom status bar so the active
 * convention sits next to the editing controls. Pushed to the right via
 * `margin-left: auto` so it always anchors to the toolbar's trailing edge.
 */
function StyleChip() {
  const citationStyle = useReferenceStore((s) => s.citationStyle);
  const setCitationStyle = useReferenceStore((s) => s.setCitationStyle);
  const display = useReferenceStore((s) => s.citationDisplay);
  const toggleDisplay = useReferenceStore((s) => s.toggleCitationDisplay);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const editionLabel = STYLE_EDITION[citationStyle.toLowerCase()] ?? "";

  const setDisplay = useCallback(
    (mode: "chip" | "footnote") => {
      if (display !== mode) toggleDisplay();
    },
    [display, toggleDisplay]
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const menuWidth = 200;
    setPos({
      top: r.bottom + 6,
      left: Math.max(8, r.right - menuWidth),
    });
  }, [open]);

  const ordered = getOrderedStyleNames();
  const dividerAfter = PRIMARY_STYLES.length;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`editor-toolbar-style ${open ? "is-open" : ""}`}
        title={`Citation style — ${citationStyle.toUpperCase()}${editionLabel ? ` · ${editionLabel}` : ""}`}
      >
        <Quote size={11} className="editor-toolbar-style-icon" aria-hidden="true" />
        <span className="editor-toolbar-style-label">
          <span className="editor-toolbar-style-name">{citationStyle.toUpperCase()}</span>
          {editionLabel && (
            <span className="editor-toolbar-style-edn">{editionLabel}</span>
          )}
        </span>
        <ChevronDown size={11} className="editor-toolbar-style-chevron" aria-hidden="true" />
      </button>

      {open && pos && createPortal(
        <div
          ref={portalRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
          }}
          className="menu-surface w-[200px] py-1 animate-fade-in"
        >
          {/* Display group — flips between in-line @key chips and
              superscript-numbered footnote markers in the editor.
              The PDF output is unaffected; this is purely how citations
              render on screen. */}
          <div className="px-3 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            Display
          </div>
          <button
            type="button"
            onClick={() => { setDisplay("chip"); setOpen(false); }}
            className={`menu-item justify-between ${display === "chip" ? "text-[var(--accent-dark)] bg-[var(--accent-light)]" : ""}`}
          >
            <span className="inline-flex items-center gap-2">
              <Type size={12} className="shrink-0" />
              Inline chip
            </span>
            {display === "chip" && <Check size={12} className="shrink-0" />}
          </button>
          <button
            type="button"
            onClick={() => { setDisplay("footnote"); setOpen(false); }}
            className={`menu-item justify-between ${display === "footnote" ? "text-[var(--accent-dark)] bg-[var(--accent-light)]" : ""}`}
          >
            <span className="inline-flex items-center gap-2">
              <Superscript size={12} className="shrink-0" />
              Footnote marker
            </span>
            {display === "footnote" && <Check size={12} className="shrink-0" />}
          </button>

          <div className="my-1 border-t border-[var(--border-light)]" />

          <div className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            Style
          </div>
          {ordered.map((name, i) => {
            const active = name === citationStyle;
            return (
              <div key={name}>
                {i === dividerAfter && (
                  <div className="my-0.5 border-t border-[var(--border-light)]" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCitationStyle(name);
                    setOpen(false);
                  }}
                  className={`menu-item justify-between ${active ? "text-[var(--accent-dark)] bg-[var(--accent-light)]" : ""}`}
                >
                  <span className="font-semibold tracking-wide">{name.toUpperCase()}</span>
                  {active && <Check size={12} className="shrink-0" />}
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
