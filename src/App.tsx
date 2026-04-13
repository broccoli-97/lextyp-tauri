import { useCallback, useState, useEffect, useRef } from "react";
import { Editor } from "./components/Editor";
import { PdfPreview } from "./components/PdfPreview";
import { StatusBar } from "./components/StatusBar";
import { Sidebar } from "./components/Sidebar";
import { useWorkspaceStore } from "./stores/workspace-store";
import { useSettingsStore } from "./stores/settings-store";
import { useT } from "./lib/i18n";

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 380;
const PDF_MIN = 280;

function clampSidebar(w: number, windowWidth: number) {
  return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Math.min(w, Math.floor(windowWidth * 0.3))));
}

function clampPdf(w: number, windowWidth: number) {
  return Math.max(PDF_MIN, Math.min(w, Math.floor(windowWidth * 0.5)));
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => clampSidebar(Math.round(window.innerWidth * 0.18), window.innerWidth));
  const [pdfPanelWidth, setPdfPanelWidth] = useState(() => clampPdf(Math.round(window.innerWidth * 0.35), window.innerWidth));
  const [pdfPanelCollapsed, setPdfPanelCollapsed] = useState(false);
  const [resizingPanel, setResizingPanel] = useState<"sidebar" | "pdf" | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const prevWindowWidth = useRef(window.innerWidth);
  const activeDocumentPath = useWorkspaceStore((s) => s.activeDocumentPath);
  const saveActiveDocument = useWorkspaceStore((s) => s.saveActiveDocument);
  const isDirty = useWorkspaceStore((s) => s.isDirty);
  const theme = useSettingsStore((s) => s.theme);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Block browser-default shortcuts that do not apply in this Tauri app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod) {
        // Block: save page, print, new window/tab, close tab, refresh,
        // browser find/replace, address bar, bookmark, history
        const blocked = ["s", "p", "n", "t", "w", "r", "f", "g", "h", "l", "d", "j"];
        if (blocked.includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
      }
      // Block F5 (refresh), F7 (caret browsing), F12 (devtools in prod)
      if (["F5", "F7"].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  // Scale panels proportionally on window resize / fullscreen
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const prev = prevWindowWidth.current;
      prevWindowWidth.current = w;

      if (w < 900) {
        setSidebarCollapsed(true);
      }

      // Skip if user is actively dragging
      if (resizingPanel) return;

      const ratio = w / prev;

      setSidebarWidth((prevW) => {
        if (sidebarCollapsed) return prevW;
        return clampSidebar(Math.round(prevW * ratio), w);
      });
      setPdfPanelWidth((prevW) => {
        if (pdfPanelCollapsed) return prevW;
        return clampPdf(Math.round(prevW * ratio), w);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarCollapsed, pdfPanelCollapsed, resizingPanel]);

  // Handle resize drag for both sidebar and pdf panel
  useEffect(() => {
    if (!resizingPanel) return;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      if (resizingPanel === "sidebar") {
        setSidebarWidth(clampSidebar(e.clientX, w));
      } else {
        setPdfPanelWidth(clampPdf(w - e.clientX, w));
      }
    };

    const handleMouseUp = () => {
      setResizingPanel(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingPanel]);

  // Save on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirty) {
        saveActiveDocument().catch(console.error);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, saveActiveDocument]);

  const handleInsertCitation = useCallback((key: string) => {
    const fn = (window as any).__lextyp_insertCitation;
    if (fn) fn(key);
  }, []);

  const startSidebarResize = useCallback(() => {
    setResizingPanel("sidebar");
  }, []);

  const startPdfResize = useCallback(() => {
    setResizingPanel("pdf");
  }, []);

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onInsertCitation={handleInsertCitation}
        width={sidebarWidth}
      />

      {/* Sidebar resize handle */}
      {!sidebarCollapsed && (
        <div
          onMouseDown={startSidebarResize}
          className={`w-1.5 bg-[var(--border-light)] hover:bg-[var(--accent)] cursor-col-resize transition-colors shrink-0 relative group ${
            resizingPanel === "sidebar" ? "bg-[var(--accent)]" : ""
          }`}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          {resizingPanel === "sidebar" && (
            <div className="absolute inset-y-0 left-0 right-0 bg-[var(--accent)]/20" />
          )}
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Editor panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
            {activeDocumentPath ? (
              <Editor />
            ) : (
              <EmptyState />
            )}
          </div>
          <StatusBar />
        </div>

        {/* PDF resize handle */}
        {!pdfPanelCollapsed && activeDocumentPath && (
          <div
            ref={resizeRef}
            onMouseDown={startPdfResize}
            className={`w-1.5 bg-[var(--border-light)] hover:bg-[var(--accent)] cursor-col-resize transition-colors shrink-0 relative group ${
              resizingPanel === "pdf" ? "bg-[var(--accent)]" : ""
            }`}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            {resizingPanel === "pdf" && (
              <div className="absolute inset-y-0 left-0 right-0 bg-[var(--accent)]/20" />
            )}
          </div>
        )}

        {/* PDF Preview panel */}
        {activeDocumentPath && (
          <div
            className={`hidden md:flex flex-col bg-[var(--bg-secondary)] overflow-hidden ${
              pdfPanelCollapsed ? "w-12" : ""
            } ${resizingPanel ? "" : "transition-[width] duration-200"}`}
            style={{ width: pdfPanelCollapsed ? 48 : pdfPanelWidth }}
          >
            <PdfPreview
              collapsed={pdfPanelCollapsed}
              onToggleCollapse={() => setPdfPanelCollapsed(!pdfPanelCollapsed)}
              panelWidth={pdfPanelWidth}
              isResizing={resizingPanel === "pdf"}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-20 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 bg-[var(--bg-secondary)]">
        <span className="text-[24px] text-[var(--text-tertiary)]">
          {"\u270E"}
        </span>
      </div>
      <div className="text-center">
        <p className="text-[14px] font-medium text-[var(--text-secondary)]">
          {t("editor.noDocument")}
        </p>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
          {t("editor.noDocumentHint")}
        </p>
      </div>
    </div>
  );
}

export default App;
