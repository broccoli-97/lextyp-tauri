import { useCallback, useState } from "react";
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
  const { setEntries } = useReferenceStore();

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

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onAction={handleAction}
        onInsertCitation={handleInsertCitation}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-hidden">
            <Editor />
          </div>
          <StatusBar />
        </div>

        {/* PDF Preview panel */}
        <div className="w-[38%] min-w-[240px] border-l border-[var(--border)] overflow-hidden">
          <PdfPreview />
        </div>
      </div>
    </div>
  );
}

export default App;
