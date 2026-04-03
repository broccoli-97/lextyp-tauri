import { useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Editor } from "./components/Editor";
import { PdfPreview } from "./components/PdfPreview";
import { StatusBar } from "./components/StatusBar";
import { NavigationBar } from "./components/NavigationBar";
import { ReferencePanel } from "./components/ReferencePanel";
import { useAppStore } from "./stores/app-store";
import { useReferenceStore } from "./stores/reference-store";
import { parseBibtex } from "./lib/bib-parser";

function App() {
  const { sidebarVisible } = useAppStore();
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

  return (
    <div className="flex flex-col h-screen select-none">
      <div className="flex flex-1 overflow-hidden">
        <NavigationBar onLoadBib={handleLoadBib} />

        {/* Side panel (references) */}
        {sidebarVisible && (
          <div className="w-56 min-w-[180px] max-w-[320px] border-r border-[#E0E0E0] overflow-hidden shrink-0">
            <ReferencePanel onInsertCitation={handleInsertCitation} />
          </div>
        )}

        {/* Editor + PDF split */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor */}
          <div className="flex-1 min-w-[300px] bg-white overflow-hidden relative">
            <Editor />
          </div>

          {/* Resize handle */}
          <div className="w-px bg-[#E0E0E0] cursor-col-resize" />

          {/* PDF Preview */}
          <div className="w-[35%] min-w-[200px] overflow-hidden">
            <PdfPreview />
          </div>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
