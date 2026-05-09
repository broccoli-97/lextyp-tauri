import { useCallback, useState, useEffect, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PencilLine, Sparkles } from "lucide-react";
import { Editor } from "./components/Editor";
import { EmptyState as EmptyStateShell } from "./components/EmptyState";
import { PdfPreview } from "./components/PdfPreview";
import { StatusBar } from "./components/StatusBar";
import { Sidebar } from "./components/Sidebar";
import { useWorkspaceStore } from "./stores/workspace-store";
import { useSettingsStore } from "./stores/settings-store";
import { useT } from "./lib/i18n";
import { welcomeTemplate } from "./lib/templates";

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

  // Route external-URL anchor clicks to the OS default browser. In a Tauri
  // webview, a plain `<a href="https://…">` click (pdf.js annotation links,
  // Ctrl+click on editor links) otherwise navigates the single webview away
  // from the app with no way back. Inside the editor itself we additionally
  // swallow plain clicks so the caret can land in a link for editing —
  // only a modifier click opens the URL, matching Notion/VS Code.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return; // ignore right/middle buttons
      const anchor = (e.target as HTMLElement | null)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      const external =
        /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
      if (!external) return;

      const inEditor = !!anchor.closest(".bn-container");
      const modifier = e.ctrlKey || e.metaKey;

      // Always block the webview's built-in navigation.
      e.preventDefault();
      e.stopPropagation();

      // In the editor, a plain click just edits; require modifier to open.
      if (inEditor && !modifier) return;

      openUrl(href).catch((err) => console.error("Failed to open URL:", err));
    };
    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
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
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
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
            className={`pane-resize-handle ${
              resizingPanel === "sidebar" ? "is-active" : ""
            }`}
          />
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
          </div>

          {/* PDF resize handle */}
          {!pdfPanelCollapsed && activeDocumentPath && (
            <div
              ref={resizeRef}
              onMouseDown={startPdfResize}
              className={`pane-resize-handle ${
                resizingPanel === "pdf" ? "is-active" : ""
              }`}
            />
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

      {/* Full-width status bar — spans sidebar + editor + PDF panel */}
      <StatusBar />
    </div>
  );
}

function EmptyState() {
  const t = useT();
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const createDocumentFromTemplate = useWorkspaceStore(
    (s) => s.createDocumentFromTemplate
  );
  const [openingExample, setOpeningExample] = useState(false);

  const handleOpenExample = useCallback(async () => {
    if (!workspacePath || openingExample) return;
    setOpeningExample(true);
    try {
      await createDocumentFromTemplate(workspacePath, welcomeTemplate);
    } catch (err) {
      console.error("Failed to open example template:", err);
    } finally {
      setOpeningExample(false);
    }
  }, [workspacePath, createDocumentFromTemplate, openingExample]);

  return (
    <EmptyStateShell
      icon={<PencilLine size={22} />}
      title={t("editor.noDocument")}
      description={t("editor.noDocumentHint")}
      cta={
        workspacePath ? (
          <button
            type="button"
            onClick={handleOpenExample}
            disabled={openingExample}
            className="btn btn-soft"
          >
            <Sparkles size={14} />
            {openingExample
              ? t("empty.openingExample")
              : t("empty.openExample")}
          </button>
        ) : undefined
      }
    />
  );
}

export default App;
