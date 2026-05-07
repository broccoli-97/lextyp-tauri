import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReferenceStore } from "../stores/reference-store";
import type { BibEntry } from "../types/bib";

interface CitationTagProps {
  entryKey: string;
}

/**
 * Inline-content view for a citation marker.
 *
 * `display === "chip"` → renders the familiar `@key` pill. Clicking opens a
 * portal-anchored card with the underlying bibliography fields.
 * `display === "footnote"` → renders nothing visible *itself*; the surrounding
 * `.editor-citations-footnote` CSS handles the superscript counter and
 * underlines the containing block.
 *
 * Both modes are rendered into the same DOM shape so document state never
 * changes when the user toggles modes — only CSS does.
 */
export function CitationTag({ entryKey }: CitationTagProps) {
  const display = useReferenceStore((s) => s.citationDisplay);
  const entry = useReferenceStore((s) =>
    s.entries.find((e) => e.key === entryKey)
  );

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (cardRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const cardWidth = 320;
    const left = Math.min(
      Math.max(8, r.left),
      window.innerWidth - cardWidth - 8
    );
    setPos({ top: r.bottom + 6, left });
  }, [open]);

  // Re-anchor the popover the next paint after a mode flip — the chip and
  // the superscript have different bounding boxes so the card would otherwise
  // appear in the old spot.
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const cardWidth = 320;
    const left = Math.min(
      Math.max(8, r.left),
      window.innerWidth - cardWidth - 8
    );
    setPos({ top: r.bottom + 6, left });
  }, [display, open]);

  return (
    <>
      <span
        ref={anchorRef}
        className="lextyp-citation"
        data-citation-key={entryKey}
        contentEditable={false}
        onMouseDown={(e) => {
          // Keep ProseMirror from moving the selection when the user clicks
          // the chip — we want the click to open the details card, not
          // collapse the selection inside the inline content.
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="lextyp-citation-key">@{entryKey}</span>
      </span>

      {open && pos && createPortal(
        <div
          ref={cardRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
          }}
          className="lextyp-citation-card"
        >
          <CitationCardBody entryKey={entryKey} entry={entry} />
        </div>,
        document.body,
      )}
    </>
  );
}

function CitationCardBody({
  entryKey,
  entry,
}: {
  entryKey: string;
  entry: BibEntry | undefined;
}) {
  if (!entry) {
    return (
      <>
        <div className="lextyp-citation-card-header">
          <span className="lextyp-citation-card-key">@{entryKey}</span>
          <span className="lextyp-citation-card-type">missing</span>
        </div>
        <div className="lextyp-citation-card-empty">
          No bibliography entry with this key.
        </div>
      </>
    );
  }

  const author = entry.fields.author || entry.fields.editor || "";
  const title = entry.fields.title || "";
  const year = entry.fields.year || entry.fields.date || "";
  const venue =
    entry.fields.journal ||
    entry.fields.booktitle ||
    entry.fields.publisher ||
    "";

  // Show all remaining fields in a compact grid, skipping the ones already
  // surfaced above so the card doesn't repeat itself.
  const surfaced = new Set(["author", "editor", "title", "year", "date", "journal", "booktitle", "publisher"]);
  const extraFields = Object.entries(entry.fields).filter(
    ([k, v]) => !surfaced.has(k) && v && v.trim()
  );

  return (
    <>
      <div className="lextyp-citation-card-header">
        <span className="lextyp-citation-card-key">@{entry.key}</span>
        <span className="lextyp-citation-card-type">{entry.type}</span>
      </div>

      {title && <div className="lextyp-citation-card-title">{stripBraces(title)}</div>}
      {author && <div className="lextyp-citation-card-author">{stripBraces(author)}</div>}

      {(year || venue) && (
        <div className="lextyp-citation-card-meta">
          {venue && <span className="lextyp-citation-card-venue">{stripBraces(venue)}</span>}
          {venue && year && <span className="lextyp-citation-card-sep">·</span>}
          {year && <span className="lextyp-citation-card-year">{year}</span>}
        </div>
      )}

      {extraFields.length > 0 && (
        <div className="lextyp-citation-card-fields">
          {extraFields.map(([k, v]) => (
            <div key={k} className="lextyp-citation-card-field">
              <span className="lextyp-citation-card-field-name">{k}</span>
              <span className="lextyp-citation-card-field-value">{stripBraces(v)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function stripBraces(value: string): string {
  return value.replace(/[{}]/g, "").trim();
}
