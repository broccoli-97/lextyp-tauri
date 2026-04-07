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

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  panelWidth: number;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200];

export function PdfPreview({ collapsed, onToggleCollapse, panelWidth }: PdfPreviewProps) {
  const pdfBase64 = useAppStore((s) => s.pdfBase64);
  const lastError = useAppStore((s) => s.lastError);
  const compiling = useAppStore((s) => s.compiling);
  const [numPages, setNumPages] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(2); // Default 100%
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const zoom = ZOOM_LEVELS[zoomIndex];

  // Mouse-drag panning
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 100) return;
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  }, [zoom]);

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

  // Base page width fits the panel; zoom is applied via CSS transform
  const basePageWidth = useMemo(() => {
    return Math.max(200, panelWidth - 48);
  }, [panelWidth]);

  const scale = zoom / 100;

  // A4 ratio: 297/210 ≈ 1.4143; space-y-4 = 16px gap between pages
  const contentHeight = useMemo(() => {
    const pageHeight = basePageWidth * (297 / 210);
    return numPages * pageHeight + Math.max(0, numPages - 1) * 16;
  }, [basePageWidth, numPages]);

  // Convert base64 to data URL for react-pdf
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

  // Collapsed state
  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center pt-4">
        <button
          onClick={onToggleCollapse}
          className="icon-btn hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          title="Expand preview"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="mt-2 flex flex-col items-center gap-2">
          <FileText size={16} className="text-[var(--text-tertiary)] rotate-90" />
          <span className="text-[9px] text-[var(--text-tertiary)] writing-mode-vertical rotate-180" style={{ writingMode: "vertical-rl" }}>
            PDF Preview
          </span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!pdfData && !lastError) {
    return (
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 h-11 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Preview</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="icon-btn w-7 h-7"
            title="Collapse preview"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          {compiling ? (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
              </div>
              <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                Compiling document...
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
                  Preview will appear here
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  Start typing to see your document
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
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 h-11 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
          <div className="flex items-center gap-2">
            <FileWarning size={14} className="text-[var(--error)]" />
            <span className="text-[12px] font-medium text-[var(--error)]">Error</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="icon-btn w-7 h-7"
            title="Collapse preview"
          >
            <ChevronRight size={14} />
          </button>
        </div>
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
          <span className="text-[12px] font-medium text-[var(--text-primary)]">Preview</span>
          {numPages > 0 && (
            <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
              {numPages} {numPages === 1 ? "page" : "pages"}
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

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="btn btn-ghost h-7 px-2 text-[11px] font-medium gap-1"
            title="Download PDF"
          >
            <Download size={14} />
            <span className="hidden lg:inline">Download</span>
          </button>

          {/* Collapse button */}
          <button
            onClick={onToggleCollapse}
            className="icon-btn w-7 h-7"
            title="Collapse preview"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* PDF content */}
      <div
        className="flex-1 overflow-auto p-4"
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: zoom > 100 ? (isDragging ? "grabbing" : "grab") : undefined }}
      >
        <Document
          file={pdfData}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={(err) => console.error("PDF load error:", err)}
          loading={
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={20} className="animate-spin text-[var(--text-tertiary)]" />
              <span className="text-[12px] text-[var(--text-tertiary)]">Loading PDF...</span>
            </div>
          }
        >
          <div style={{ width: basePageWidth * scale, height: contentHeight * scale }}>
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: basePageWidth,
              }}
            >
              <div className="space-y-4">
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i} className="rounded-lg overflow-hidden shadow-md bg-white">
                    <Page
                      pageNumber={i + 1}
                      width={basePageWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Document>
      </div>
    </div>
  );
}
