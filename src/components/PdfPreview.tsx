import { useState, useMemo, useCallback, useRef } from "react";
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
import { useT } from "../lib/i18n";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** A4 aspect ratio: height / width */
const A4_RATIO = 297 / 210;
const PAGE_GAP = 16;
const PADDING = 24;

interface PdfPreviewProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  panelWidth: number;
  isResizing?: boolean;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200];

export function PdfPreview({ collapsed, onToggleCollapse, panelWidth, isResizing }: PdfPreviewProps) {
  const t = useT();
  const pdfBase64 = useAppStore((s) => s.pdfBase64);
  const lastError = useAppStore((s) => s.lastError);
  const compiling = useAppStore((s) => s.compiling);
  const [numPages, setNumPages] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(2); // Default 100%
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const zoom = ZOOM_LEVELS[zoomIndex];
  const scale = zoom / 100;

  // Freeze panel width during resize to prevent re-renders on every pixel
  const stableWidthRef = useRef(panelWidth);
  if (!isResizing) {
    stableWidthRef.current = panelWidth;
  }
  const stableWidth = stableWidthRef.current;

  // At 100% zoom, page fits the panel width (minus padding).
  // Zoom scales from this baseline. The rendered width is what react-pdf
  // actually draws — vector text stays sharp at any zoom.
  const fitWidth = Math.max(200, stableWidth - PADDING * 2);
  const renderedPageWidth = Math.round(fitWidth * scale);
  const renderedPageHeight = Math.round(renderedPageWidth * A4_RATIO);

  // Total content size (all pages + gaps)
  const contentWidth = renderedPageWidth;
  const contentHeight = numPages * renderedPageHeight + Math.max(0, numPages - 1) * PAGE_GAP;

  // Drag panning — works whenever content overflows the container
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only enable drag if content overflows
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
    el.scrollTop = dragStart.current.scrollTop - (e.clientY - dragStart.current.y);
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    scrollRef.current?.releasePointerCapture(e.pointerId);
  }, [isDragging]);

  const pdfData = useMemo(() => {
    if (!pdfBase64) return null;
    return `data:application/pdf;base64,${pdfBase64}`;
  }, [pdfBase64]);

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  }, []);

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

  // Whether content overflows — controls cursor style
  const overflows = contentWidth > stableWidth - PADDING * 2 || contentHeight > 0;

  // Collapsed state
  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center pt-4">
        <button
          onClick={onToggleCollapse}
          className="icon-btn hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title={t("pdf.expand")}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="mt-2 flex flex-col items-center gap-2">
          <FileText size={16} className="text-[var(--text-tertiary)] rotate-90" />
          <span className="text-[9px] text-[var(--text-tertiary)] writing-mode-vertical rotate-180" style={{ writingMode: "vertical-rl" }}>
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
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          {compiling ? (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
              </div>
              <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                {t("pdf.compiling")}
              </span>
            </div>
          ) : (
            <>
              <div className="w-20 h-24 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 bg-[var(--bg-primary)]">
                <FileText size={24} className="text-[var(--text-tertiary)]" />
                <span className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">PDF</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                  {t("pdf.willAppear")}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {t("pdf.startTyping")}
                </span>
              </div>
            </>
          )}
        </div>
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

  // PDF display
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 h-11 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[var(--accent)]" />
          <span className="text-[12px] font-medium text-[var(--text-primary)]">{t("pdf.preview")}</span>
          {numPages > 0 && (
            <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
              {numPages} {numPages === 1 ? t("pdf.page") : t("pdf.pages")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 mr-1 px-1.5 py-0.5 rounded-md bg-[var(--bg-tertiary)]">
            <button
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={14} className="text-[var(--text-secondary)]" />
            </button>
            <span className="text-[10px] font-semibold text-[var(--text-primary)] w-10 text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={14} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="btn btn-ghost h-7 px-2 text-[11px] font-medium gap-1"
            title={t("pdf.download")}
          >
            <Download size={14} />
            <span className="hidden lg:inline">{t("pdf.download")}</span>
          </button>

          {/* Collapse */}
          <button
            onClick={onToggleCollapse}
            className="icon-btn w-7 h-7"
            title={t("pdf.collapse")}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* PDF content — scrollable in both axes, drag to pan */}
      <div
        className="flex-1 overflow-auto"
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          cursor: overflows ? (isDragging ? "grabbing" : "grab") : undefined,
        }}
      >
        {/* Center the content when it fits; allow overflow when zoomed */}
        <div
          style={{
            minWidth: "100%",
            minHeight: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: PADDING,
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
            <div style={{ display: "flex", flexDirection: "column", gap: PAGE_GAP }}>
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden shadow-md bg-white"
                  style={{ width: renderedPageWidth, height: renderedPageHeight }}
                >
                  <Page
                    pageNumber={i + 1}
                    width={renderedPageWidth}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </div>
              ))}
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
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
    <div className="flex items-center justify-between px-3 h-11 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
      <div className="flex items-center gap-2">
        {icon || <FileText size={14} className="text-[var(--text-tertiary)]" />}
        <span className={`text-[12px] font-medium ${labelColor || "text-[var(--text-secondary)]"}`}>{label}</span>
      </div>
      <button onClick={onCollapse} className="icon-btn w-7 h-7" title={collapseTitle}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
