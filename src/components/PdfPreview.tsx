import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FileWarning, Loader2 } from "lucide-react";
import { useAppStore } from "../stores/app-store";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfPreview() {
  const { lastPdfPath, lastError, compiling } = useAppStore();
  const [numPages, setNumPages] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (lastPdfPath) {
      setPdfUrl(`https://asset.localhost/${encodeURIComponent(lastPdfPath)}`);
    }
  }, [lastPdfPath]);

  // Empty state
  if (!pdfUrl && !lastError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-tertiary)]">
        {compiling ? (
          <Loader2 size={24} className="animate-spin" />
        ) : (
          <>
            <div className="w-16 h-20 rounded-lg border-2 border-dashed border-[var(--border)] flex items-center justify-center">
              <span className="text-[10px] font-medium">PDF</span>
            </div>
            <span className="text-[12px]">Preview will appear here</span>
          </>
        )}
      </div>
    );
  }

  // Error state
  if (lastError) {
    return (
      <div className="h-full flex flex-col p-5 overflow-auto">
        <div className="flex items-center gap-2 mb-3">
          <FileWarning size={16} className="text-red-500 shrink-0" />
          <span className="text-[13px] font-medium text-red-600">Compilation Error</span>
        </div>
        <pre className="text-[11px] text-red-500/80 whitespace-pre-wrap font-mono leading-relaxed bg-red-50 rounded-lg p-3">
          {lastError}
        </pre>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[var(--bg-secondary)] p-5">
      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        onLoadError={(err) => console.error("PDF load error:", err)}
        loading={
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-[var(--text-tertiary)]" />
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i}
            pageNumber={i + 1}
            width={480}
            className="mb-5 shadow-sm rounded-sm overflow-hidden"
          />
        ))}
      </Document>
    </div>
  );
}
