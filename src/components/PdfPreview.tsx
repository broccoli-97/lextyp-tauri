import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAppStore } from "../stores/app-store";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfPreview() {
  const { lastPdfPath, lastError, compiling } = useAppStore();
  const [numPages, setNumPages] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Convert local file path to a URL that react-pdf can load
  useEffect(() => {
    if (lastPdfPath) {
      // Tauri serves local files via asset protocol
      const url = `https://asset.localhost/${encodeURIComponent(lastPdfPath)}`;
      setPdfUrl(url);
    }
  }, [lastPdfPath]);

  if (!pdfUrl && !lastError) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[#BDBDBD]">
        {compiling ? "Compiling..." : "PDF preview will appear here"}
      </div>
    );
  }

  if (lastError) {
    return (
      <div className="h-full p-4 overflow-auto">
        <div className="text-xs font-bold text-red-600 mb-2">Compilation Error</div>
        <pre className="text-xs text-red-500 whitespace-pre-wrap font-mono">{lastError}</pre>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[#F5F5F5] p-4">
      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        onLoadError={(err) => console.error("PDF load error:", err)}
        loading={
          <div className="text-xs text-[#9E9E9E] text-center py-8">Loading PDF...</div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i}
            pageNumber={i + 1}
            width={500}
            className="mb-4 shadow-md"
          />
        ))}
      </Document>
    </div>
  );
}
