import { useCallback, useState, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Editor } from "./components/Editor";
import { PdfPreview } from "./components/PdfPreview";
import { StatusBar } from "./components/StatusBar";
import { Sidebar } from "./components/Sidebar";
import { useReferenceStore } from "./stores/reference-store";
import { parseBibtex } from "./lib/bib-parser";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pdfPanelWidth, setPdfPanelWidth] = useState(420);
  const [pdfPanelCollapsed, setPdfPanelCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const { setEntries } = useReferenceStore();
  const resizeRef = useRef<HTMLDivElement>(null);

  // Responsive: auto-collapse sidebar on small windows
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX - (sidebarCollapsed ? 48 : 240);
      setPdfPanelWidth(Math.max(280, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, sidebarCollapsed]);

  const handleLoadBib = useCallback(async () => {
    const file = await open({
      filters: [{ name: "BibTeX", extensions: ["bib"] }],
    });
    if (!file) return;
    try {
      const content = await invoke<string>("read_bib_file", { path: file });
      const entries = parseBibtex(content);
      setEntries(entries, file);
    } catch (err) {
      console.error("Failed to load bib file:", err);
    }
  }, [setEntries]);

  const handleInsertCitation = useCallback((key: string) => {
    const fn = (window as any).__lextyp_insertCitation;
    if (fn) fn(key);
  }, []);

  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case "loadbib":
          handleLoadBib();
          break;
        default:
          console.log("Action:", action);
      }
    },
    [handleLoadBib]
  );

  const startResize = useCallback(() => {
    setIsResizing(true);
  }, []);

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onAction={handleAction}
        onInsertCitation={handleInsertCitation}
      />

      {/* Main content area */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Editor panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
            <Editor />
          </div>
          <StatusBar />
        </div>

        {/* Resizer handle */}
        {!pdfPanelCollapsed && (
          <div
            ref={resizeRef}
            onMouseDown={startResize}
            className={`w-1.5 bg-[var(--border-light)] hover:bg-[var(--accent)] cursor-col-resize transition-colors shrink-0 relative group ${
              isResizing ? "bg-[var(--accent)]" : ""
            }`}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            {isResizing && (
              <div className="absolute inset-y-0 left-0 right-0 bg-[var(--accent)]/20" />
            )}
          </div>
        )}

        {/* PDF Preview panel */}
        <div
          className={`hidden md:flex flex-col bg-[var(--bg-secondary)] overflow-hidden transition-all duration-200 ${
            pdfPanelCollapsed ? "w-12" : ""
          }`}
          style={{ width: pdfPanelCollapsed ? 48 : pdfPanelWidth }}
        >
          <PdfPreview
            collapsed={pdfPanelCollapsed}
            onToggleCollapse={() => setPdfPanelCollapsed(!pdfPanelCollapsed)}
            panelWidth={pdfPanelWidth}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
