import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  FileWarning,
  Loader2,
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "../stores/app-store";
import type { SourceMapEntry } from "../stores/app-store";
import { useT } from "../lib/i18n";
import { EmptyState } from "./EmptyState";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** A4 aspect ratio: height / width */
const A4_RATIO = 297 / 210;
/** A4 dimensions in Typst points (1pt = 1/72 inch) */
const A4_WIDTH_PT = 595.28;
const PAGE_GAP = 16;
const PADDING = 24;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.15; // For button clicks
const WHEEL_SENSITIVITY = 0.002; // For Ctrl+wheel

interface PdfPreviewProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  panelWidth: number;
  isResizing?: boolean;
}

export function PdfPreview({ collapsed, onToggleCollapse, panelWidth, isResizing }: PdfPreviewProps) {
  const t = useT();
  const pdfBase64 = useAppStore((s) => s.pdfBase64);
  const lastError = useAppStore((s) => s.lastError);
  const compiling = useAppStore((s) => s.compiling);
  const sourceMap = useAppStore((s) => s.sourceMap);
  const [numPages, setNumPages] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Continuous zoom: `zoom` is the live value (drives CSS transform for
  // instant feedback). `renderedZoom` is what react-pdf actually rendered
  // at — only updated after a debounce to avoid thrashing re-renders.
  const [zoom, setZoom] = useState(1.0);
  const [renderedZoom, setRenderedZoom] = useState(1.0);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Pointer-drag bookkeeping. We *don't* set `isDragging` or call
  // `setPointerCapture` on pointerdown — that interferes with the second
  // mousedown of a dblclick pair on some webviews and the dblclick handler
  // never fires. Instead, capture is deferred until movement crosses a
  // small threshold (the same pattern FileTreeItem already uses).
  const dragArmedRef = useRef<{ pointerId: number; el: HTMLDivElement } | null>(null);
  const pointerCapturedRef = useRef(false);

  const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  const zoomPercent = Math.round(zoom * 100);

  // Freeze panel width during resize to prevent re-renders on every pixel
  const stableWidthRef = useRef(panelWidth);
  if (!isResizing) {
    stableWidthRef.current = panelWidth;
  }
  const stableWidth = stableWidthRef.current;

  // At zoom=1, page fits the panel width (minus padding).
  const fitWidth = Math.max(200, stableWidth - PADDING * 2);

  // What react-pdf renders at (full resolution, debounced)
  const renderPageWidth = Math.round(fitWidth * renderedZoom);

  // The CSS transform ratio to bridge the gap between rendered and current zoom.
  // e.g., if rendered at 100% but user zoomed to 150%, cssScale = 1.5.
  // This gives instant visual zoom while the high-res render catches up.
  const cssScale = renderedZoom > 0 ? zoom / renderedZoom : 1;

  // Visual page size after CSS transform
  const visualPageWidth = Math.round(renderPageWidth * cssScale);
  const pageHeight = Math.round(renderPageWidth * A4_RATIO);
  const totalPagesHeight =
    numPages > 0 ? numPages * pageHeight + (numPages - 1) * PAGE_GAP : 0;
  const visualTotalHeight = Math.round(totalPagesHeight * cssScale);

  // Schedule a high-res re-render after zoom stops changing. 80ms keeps the
  // user from sitting on a CSS-bilinear-scaled bitmap for very long while
  // still coalescing a wheel burst into one rasterization pass.
  const scheduleRender = useCallback((newZoom: number) => {
    if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    renderTimerRef.current = setTimeout(() => {
      setRenderedZoom(newZoom);
    }, 80);
  }, []);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    };
  }, []);

  // Ctrl+Wheel zoom centered on cursor (like typst.app)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      // Cursor position relative to the scroll container viewport
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      // Cursor position in content coordinates (before zoom)
      const contentX = (el.scrollLeft + cursorX);
      const contentY = (el.scrollTop + cursorY);

      setZoom((prev) => {
        const factor = 1 - e.deltaY * WHEEL_SENSITIVITY;
        const next = clampZoom(prev * factor);
        const ratio = next / prev;

        // Adjust scroll so the point under the cursor stays fixed
        requestAnimationFrame(() => {
          el.scrollLeft = contentX * ratio - cursorX;
          el.scrollTop = contentY * ratio - cursorY;
        });

        scheduleRender(next);
        return next;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [scheduleRender]);

  // Drag panning. `pointerdown` only records the origin and arms a pending
  // drag — pointer capture and `isDragging=true` are deferred until the
  // pointer actually moves past a 4 px threshold. A plain click/dblclick
  // therefore never enters dragging state, so the mousedown/mouseup/dblclick
  // sequence is left untouched and the dblclick handler fires reliably.
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
    if (e.button !== 0) return;
    dragArmedRef.current = { pointerId: e.pointerId, el };
    pointerCapturedRef.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const armed = dragArmedRef.current;
    if (!armed || armed.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!pointerCapturedRef.current) {
      // Wait until the pointer has actually moved before promoting to a drag.
      if (dx * dx + dy * dy < 16) return;
      try {
        armed.el.setPointerCapture(e.pointerId);
        pointerCapturedRef.current = true;
      } catch {
        // Pointer capture can fail if the element is detached mid-event.
      }
      setIsDragging(true);
    }
    armed.el.scrollLeft = dragStart.current.scrollLeft - dx;
    armed.el.scrollTop = dragStart.current.scrollTop - dy;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const armed = dragArmedRef.current;
    if (!armed || armed.pointerId !== e.pointerId) return;
    if (pointerCapturedRef.current) {
      try { armed.el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      pointerCapturedRef.current = false;
      setIsDragging(false);
    }
    dragArmedRef.current = null;
  }, []);

  const pdfData = useMemo(() => {
    if (!pdfBase64) return null;
    return `data:application/pdf;base64,${pdfBase64}`;
  }, [pdfBase64]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const next = clampZoom(prev + ZOOM_STEP);
      scheduleRender(next);
      return next;
    });
  }, [scheduleRender]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = clampZoom(prev - ZOOM_STEP);
      scheduleRender(next);
      return next;
    });
  }, [scheduleRender]);

  const handleZoomReset = useCallback(() => {
    setZoom(1.0);
    scheduleRender(1.0);
  }, [scheduleRender]);

  const handleDownload = useCallback(async () => {
    if (!pdfBase64) return;
    const filePath = await save({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      defaultPath: "document.pdf",
    });
    if (filePath) {
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      await writeFile(filePath, bytes);
    }
  }, [pdfBase64]);

  // Double-click on PDF → jump to the corresponding word in the editor.
  // The source map is built by `query_source_map` after each compile and
  // contains one entry per word (`__w`) plus one per block (`__track`).
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const jumpFn = (window as any).__lextyp_jumpToBlock as
        | ((id: string, off: number) => void)
        | undefined;
      if (!jumpFn) {
        console.warn("[PdfPreview] dblclick: no __lextyp_jumpToBlock registered");
        return;
      }

      // react-pdf sets data-page-number on the inner <div className="react-pdf__Page">.
      const pageEl = (e.target as HTMLElement | null)?.closest?.(
        "[data-page-number]"
      ) as HTMLElement | null;
      if (!pageEl) {
        console.warn("[PdfPreview] dblclick: no [data-page-number] ancestor for", e.target);
        return;
      }

      const pageNum = parseInt(pageEl.getAttribute("data-page-number") ?? "0", 10);
      if (!pageNum) return;

      if (!sourceMap.length) {
        console.warn("[PdfPreview] dblclick: source map is empty — compile may not have completed");
        return;
      }

      // Click position in points. `getBoundingClientRect` returns the
      // visually-transformed rect, which already includes any css zoom scale.
      const pageRect = pageEl.getBoundingClientRect();
      const pxPerPt = pageRect.width / A4_WIDTH_PT;
      const clickXPt = (e.clientX - pageRect.left) / pxPerPt;
      const clickYPt = (e.clientY - pageRect.top) / pxPerPt;

      const target = findNearestEntry(sourceMap, pageNum, clickXPt, clickYPt);
      if (!target) {
        console.warn(
          "[PdfPreview] dblclick: no source-map entry on page",
          pageNum,
          "(map has",
          sourceMap.length,
          "entries)"
        );
        return;
      }

      jumpFn(target.id, target.off);
    },
    [sourceMap]
  );

  // Collapsed state
  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center pt-4">
        <button
          onClick={onToggleCollapse}
          className="icon-btn"
          title={t("pdf.expand")}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="mt-2 flex flex-col items-center gap-2">
          <FileText size={16} className="text-[var(--text-tertiary)] rotate-90" />
          <span className="text-[11px] text-[var(--text-tertiary)] writing-mode-vertical rotate-180" style={{ writingMode: "vertical-rl" }}>
            {t("pdf.preview")}
          </span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!pdfData && !lastError) {
    return (
      <div className="h-full flex flex-col">
        <PdfToolbarSimple label={t("pdf.preview")} onCollapse={onToggleCollapse} collapseTitle={t("pdf.collapse")} />
        {compiling ? (
          <EmptyState
            icon={<Loader2 size={22} className="animate-spin text-[var(--accent)]" />}
            title={t("pdf.compiling")}
          />
        ) : (
          <EmptyState
            icon={<FileText size={22} />}
            title={t("pdf.willAppear")}
            description={t("pdf.startTyping")}
          />
        )}
      </div>
    );
  }

  // Error state
  if (lastError) {
    return (
      <div className="h-full flex flex-col">
        <PdfToolbarSimple
          label={t("pdf.error")}
          labelColor="text-[var(--error)]"
          icon={<FileWarning size={14} className="text-[var(--error)]" />}
          onCollapse={onToggleCollapse}
          collapseTitle={t("pdf.collapse")}
        />
        <div className="flex-1 flex flex-col p-4 overflow-auto">
          <pre className="text-[11px] text-[var(--error)] whitespace-pre-wrap font-mono leading-[1.6] bg-[var(--error-light)] rounded-lg p-3 border border-red-100 overflow-auto">
            {lastError}
          </pre>
        </div>
      </div>
    );
  }

  // Determine if content overflows for cursor style
  const canDrag = visualPageWidth > stableWidth - PADDING * 2;

  // PDF display
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-[var(--border-light)] bg-[var(--bg-secondary)] shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[var(--accent)]" />
          <span className="text-[12px] font-medium text-[var(--text-primary)]">{t("pdf.preview")}</span>
          {numPages > 0 && (
            <span className="text-[11px] text-[var(--text-tertiary)] ml-1">
              {numPages} {numPages === 1 ? t("pdf.page") : t("pdf.pages")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 mr-1 px-1 py-0.5 rounded-md bg-[var(--bg-tertiary)]">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="icon-btn icon-btn-sm"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={handleZoomReset}
              className="h-6 px-1.5 text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-sm transition-colors tabular-nums"
              title="Reset zoom"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="icon-btn icon-btn-sm"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="btn btn-quiet btn-sm"
            title={t("pdf.download")}
          >
            <Download size={14} />
            <span className="hidden lg:inline">{t("pdf.download")}</span>
          </button>

          {/* Collapse */}
          <button
            onClick={onToggleCollapse}
            className="icon-btn icon-btn-sm"
            title={t("pdf.collapse")}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* PDF content — scrollable in both axes, Ctrl+wheel to zoom, drag to pan, double-click to jump */}
      <div
        className="flex-1 overflow-auto"
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: canDrag ? (isDragging ? "grabbing" : "grab") : undefined,
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <div
          style={{
            minWidth: "100%",
            minHeight: "100%",
            display: "flex",
            // `safe center` falls back to flex-start when the content
            // overflows the container, otherwise the left half of the
            // overflow is unreachable by scrolling/dragging.
            justifyContent: "safe center",
            alignItems: "flex-start",
            padding: PADDING,
            boxSizing: "border-box",
            width: "fit-content",
          }}
        >
          <Document
            file={pdfData}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={(err) => console.error("PDF load error:", err)}
            loading={
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={20} className="animate-spin text-[var(--text-tertiary)]" />
                <span className="text-[12px] text-[var(--text-tertiary)]">{t("pdf.loading")}</span>
              </div>
            }
          >
            {/* CSS transform gives instant zoom; react-pdf re-renders at
                full resolution after 200ms debounce for sharpness.
                The outer wrapper is sized to the *visual* (scaled) box so
                the scroll container's scrollWidth/Height reflect the zoom,
                otherwise horizontal drag-pan would be clamped to 0. */}
            <div
              style={{
                width: visualPageWidth,
                height: visualTotalHeight,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: cssScale !== 1 ? `scale(${cssScale})` : undefined,
                  transformOrigin: "top left",
                  willChange: cssScale !== 1 ? "transform" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  gap: PAGE_GAP,
                }}
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden shadow-md bg-white"
                    style={{ width: renderPageWidth, height: pageHeight }}
                  >
                    <Page
                      pageNumber={i + 1}
                      width={renderPageWidth}
                      renderTextLayer={false}
                      // Annotation layer carries the clickable <a> elements
                      // for `#link(...)` hyperlinks produced by Typst.
                      renderAnnotationLayer={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
}

/**
 * Find the nearest source-map marker (word) to a click position on a page.
 * Y is weighted heavily so that words on the same visual line as the click
 * are strongly preferred; among those, the closest by X wins.
 */
function findNearestEntry(
  sourceMap: SourceMapEntry[],
  page: number,
  clickXPt: number,
  clickYPt: number
): SourceMapEntry | null {
  const onPage = sourceMap.filter((e) => e.page === page);
  if (onPage.length === 0) return null;

  let best = onPage[0];
  let bestScore = score(best, clickXPt, clickYPt);
  for (let i = 1; i < onPage.length; i++) {
    const s = score(onPage[i], clickXPt, clickYPt);
    if (s < bestScore) {
      best = onPage[i];
      bestScore = s;
    }
  }
  return best;
}

function score(entry: SourceMapEntry, x: number, y: number): number {
  // 6× vertical weight ≈ "same line beats nearby line by a wide margin",
  // since 11pt text has ~14pt line height.
  return Math.abs(entry.y - y) * 6 + Math.abs(entry.x - x);
}

/** Simple toolbar used for empty/error states */
function PdfToolbarSimple({
  label,
  labelColor,
  icon,
  onCollapse,
  collapseTitle,
}: {
  label: string;
  labelColor?: string;
  icon?: React.ReactNode;
  onCollapse: () => void;
  collapseTitle: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 h-9 border-b border-[var(--border-light)] bg-[var(--bg-secondary)] shrink-0">
      <div className="flex items-center gap-2">
        {icon || <FileText size={14} className="text-[var(--text-tertiary)]" />}
        <span className={`text-[12px] font-medium ${labelColor || "text-[var(--text-secondary)]"}`}>{label}</span>
      </div>
      <button onClick={onCollapse} className="icon-btn icon-btn-sm" title={collapseTitle}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
