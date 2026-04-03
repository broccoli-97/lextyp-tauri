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
import { useAppStore } from "../stores/app-store";
import { FloatingOutline } from "./FloatingOutline";

export function Editor() {
  const { setCompiling, setCompilationResult, setCompilationError, setCapturedSource } =
    useAppStore();
  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useCreateBlockNote({ schema });

  const compileDocument = useCallback(async () => {
    try {
      const blocks = editor.document;
      const source = serializeToTypst(blocks as any);
      setCapturedSource(source);
      setCompiling(true);

      const result = await invoke<{ pdf_path: string; duration_ms: number }>(
        "compile_typst",
        { content: source }
      );
      setCompilationResult(result.pdf_path, result.duration_ms);
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

  // Insert citation inline at current cursor
  const insertCitation = useCallback(
    (key: string) => {
      editor.insertInlineContent([
        { type: "citation", props: { key } },
        " ",
      ]);
    },
    [editor]
  );

  // Expose insertCitation globally so ReferencePanel can use it
  useEffect(() => {
    (window as any).__lextyp_insertCitation = insertCitation;
    return () => { delete (window as any).__lextyp_insertCitation; };
  }, [insertCitation]);

  return (
    <div className="h-full overflow-auto relative">
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
      <FloatingOutline editor={editor} />
    </div>
  );
}
