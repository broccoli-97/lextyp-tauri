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
import { FloatingOutline } from "./FloatingOutline";
import { CitationPicker } from "./CitationPicker";

export function Editor() {
  const { setCompiling, setCompilationResult, setCompilationError, setCapturedSource } =
    useAppStore();
  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [citationPickerOpen, setCitationPickerOpen] = useState(false);

  const editor = useCreateBlockNote({ schema });
  const { entries, citationStyle } = useReferenceStore();

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
      setCapturedSource(source);
      setCompiling(true);

      const result = await invoke<{ pdf_base64: string; duration_ms: number }>(
        "compile_typst",
        { content: source }
      );
      setCompilationResult(result.pdf_base64, result.duration_ms);
    } catch (err: any) {
      setCompilationError(String(err), 0);
    }
  }, [editor, setCompiling, setCompilationResult, setCompilationError, setCapturedSource]);

  const handleChange = useCallback(() => {
    if (compileTimerRef.current) clearTimeout(compileTimerRef.current);
    compileTimerRef.current = setTimeout(compileDocument, 400);
  }, [compileDocument]);

  useEffect(() => {
    const timer = setTimeout(compileDocument, 500);
    return () => clearTimeout(timer);
  }, [compileDocument]);

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

  return (
    <div className="h-full overflow-auto relative">
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
