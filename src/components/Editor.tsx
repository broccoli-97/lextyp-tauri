import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController } from "@blocknote/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { schema } from "../editor/schema";
import { getSlashMenuItems } from "../editor/slash-items";
import { serializeToTypst } from "../lib/typst-serializer";
import { getFormatter } from "../lib/citation/registry";
import { useAppStore } from "../stores/app-store";
import { useReferenceStore } from "../stores/reference-store";
import { useWorkspaceStore } from "../stores/workspace-store";
import { FloatingOutline } from "./FloatingOutline";
import { CitationPicker } from "./CitationPicker";

export function Editor() {
  // Only subscribe to actions from app-store — never re-render on compile state changes
  const setCompiling = useAppStore((s) => s.setCompiling);
  const setCompilationResult = useAppStore((s) => s.setCompilationResult);
  const setCompilationError = useAppStore((s) => s.setCompilationError);

  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [citationPickerOpen, setCitationPickerOpen] = useState(false);
  const loadedPathRef = useRef<string | null>(null);

  const editor = useCreateBlockNote({ schema });
  // Only subscribe to the specific values needed from reference-store
  const entries = useReferenceStore((s) => s.entries);
  const citationStyle = useReferenceStore((s) => s.citationStyle);
  // Only subscribe to the specific values needed from workspace-store
  const activeDocumentPath = useWorkspaceStore((s) => s.activeDocumentPath);
  const activeDocumentBlocks = useWorkspaceStore((s) => s.activeDocumentBlocks);
  const setDirty = useWorkspaceStore((s) => s.setDirty);
  const setEditorInstance = useWorkspaceStore((s) => s.setEditorInstance);
  const saveActiveDocument = useWorkspaceStore((s) => s.saveActiveDocument);

  // Register editor instance with workspace store
  useEffect(() => {
    setEditorInstance(editor);
    return () => setEditorInstance(null);
  }, [editor, setEditorInstance]);

  // Load document blocks when active document changes
  useEffect(() => {
    if (!activeDocumentPath) return;

    // Avoid re-loading if we already loaded this path
    if (loadedPathRef.current === activeDocumentPath) return;
    loadedPathRef.current = activeDocumentPath;

    if (activeDocumentBlocks && activeDocumentBlocks.length > 0) {
      try {
        editor.replaceBlocks(editor.document, activeDocumentBlocks);
      } catch (err) {
        console.error("Failed to restore document blocks:", err);
      }
    } else {
      // Empty document — clear editor
      editor.replaceBlocks(editor.document, []);
    }
  }, [activeDocumentPath, activeDocumentBlocks, editor]);

  const openCitationPicker = useCallback(() => {
    setCitationPickerOpen(true);
  }, []);

  const closeCitationPicker = useCallback(() => {
    setCitationPickerOpen(false);
  }, []);

  const compileDocument = useCallback(async () => {
    try {
      const blocks = editor.document;
      const formatter = getFormatter(useReferenceStore.getState().citationStyle);
      const { entries } = useReferenceStore.getState();
      const source = serializeToTypst(blocks as any, entries, formatter);
      setCompiling(true);

      const result = await invoke<{ pdf_base64: string; duration_ms: number }>(
        "compile_typst",
        { content: source }
      );
      setCompilationResult(result.pdf_base64, result.duration_ms);
    } catch (err: any) {
      setCompilationError(String(err), 0);
    }
  }, [editor, setCompiling, setCompilationResult, setCompilationError]);

  const handleChange = useCallback(() => {
    // Mark dirty
    setDirty(true);

    // Debounced compile (400ms)
    if (compileTimerRef.current) clearTimeout(compileTimerRef.current);
    compileTimerRef.current = setTimeout(compileDocument, 400);

    // Debounced auto-save (2s)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveActiveDocument().catch(console.error);
    }, 2000);
  }, [compileDocument, setDirty, saveActiveDocument]);

  // Initial compile when document loads
  useEffect(() => {
    if (!activeDocumentPath) return;
    const timer = setTimeout(compileDocument, 500);
    return () => clearTimeout(timer);
  }, [activeDocumentPath, compileDocument]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (compileTimerRef.current) clearTimeout(compileTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const insertCitation = useCallback(
    (key: string) => {
      editor.insertInlineContent([
        { type: "citation", props: { key } } as any,
        " ",
      ]);
      setCitationPickerOpen(false);
    },
    [editor]
  );

  useEffect(() => {
    (window as any).__lextyp_insertCitation = insertCitation;
    (window as any).__lextyp_openCitationPicker = openCitationPicker;
    return () => {
      delete (window as any).__lextyp_insertCitation;
      delete (window as any).__lextyp_openCitationPicker;
    };
  }, [insertCitation, openCitationPicker]);

  // Override BlockNote's drag preview on dragstart so it works cleanly on
  // Windows/WebView2. BlockNote appends a .bn-drag-preview clone of the
  // editor DOM to the body, but on WebView2 it renders incorrectly
  // (shows sidebar/other content). We replace it with a compact element.
  const editorContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleDragStart = (e: DragEvent) => {
      if (!e.dataTransfer) return;

      // Find the block being dragged via the side menu's data
      const sideMenu = container.querySelector<HTMLElement>(".bn-side-menu");
      const blockEl = sideMenu
        ? document.querySelector<HTMLElement>(
            `[data-id="${sideMenu.closest("[data-id]")?.getAttribute("data-id") || ""}"]`
          )
        : null;

      // Build a minimal drag image from the block's visible text
      const text =
        blockEl?.textContent?.trim().slice(0, 60) ||
        (e.target as HTMLElement)?.closest?.("[data-node-type]")?.textContent?.trim().slice(0, 60) ||
        "Block";

      const ghost = document.createElement("div");
      ghost.textContent = text + (text.length >= 60 ? "..." : "");
      ghost.style.cssText =
        "position:fixed;left:-9999px;top:0;padding:6px 12px;border-radius:6px;" +
        "background:#fff;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.12);" +
        "font-size:13px;color:#1a1d21;white-space:nowrap;max-width:280px;overflow:hidden;" +
        "text-overflow:ellipsis;z-index:99999;pointer-events:none;";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);

      // Clean up after browser captures the image
      requestAnimationFrame(() => {
        document.body.removeChild(ghost);
      });
    };

    container.addEventListener("dragstart", handleDragStart, true);
    return () => container.removeEventListener("dragstart", handleDragStart, true);
  }, []);

  return (
    <div className="h-full overflow-auto relative" ref={editorContainerRef}>
      <div className="max-w-[880px] mx-auto px-8 py-10">
        <BlockNoteView
          editor={editor}
          theme="light"
          slashMenu={false}
          onChange={handleChange}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(getSlashMenuItems(editor, openCitationPicker), query)
            }
          />
        </BlockNoteView>
      </div>
      <FloatingOutline editor={editor} />
      <CitationPicker
        open={citationPickerOpen}
        entries={entries}
        formatter={getFormatter(citationStyle)}
        onClose={closeCitationPicker}
        onSelect={insertCitation}
      />
    </div>
  );
}
