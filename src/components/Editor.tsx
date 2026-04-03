import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController } from "@blocknote/react";
import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

import { schema } from "../editor/schema";
import { getSlashMenuItems } from "../editor/slash-items";
import { serializeToTypst } from "../lib/typst-serializer";
import { getFormatter } from "../lib/citation/registry";
import { useAppStore } from "../stores/app-store";
import { useReferenceStore } from "../stores/reference-store";
import { FloatingOutline } from "./FloatingOutline";

export function Editor() {
  const { setCompiling, setCompilationResult, setCompilationError, setCapturedSource } =
    useAppStore();
  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useCreateBlockNote({ schema });

  const compileDocument = useCallback(async () => {
    try {
      const blocks = editor.document;
      const { entries, citationStyle } = useReferenceStore.getState();
      const formatter = getFormatter(citationStyle);
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
    },
    [editor]
  );

  useEffect(() => {
    (window as any).__lextyp_insertCitation = insertCitation;
    return () => { delete (window as any).__lextyp_insertCitation; };
  }, [insertCitation]);

  return (
    <div className="h-full overflow-auto relative bg-[var(--bg-primary)]">
      <div className="max-w-[720px] mx-auto px-12 py-8">
        <BlockNoteView
          editor={editor}
          theme="light"
          slashMenu={false}
          onChange={handleChange}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(getSlashMenuItems(editor), query)
            }
          />
        </BlockNoteView>
      </div>
      <FloatingOutline editor={editor} />
    </div>
  );
}
