import "@blocknote/core/fonts/inter.css";
import { SideMenuController, useCreateBlockNote } from "@blocknote/react";
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
import { EditorSideMenu } from "./EditorSideMenu";
import { SlashMenu } from "./SlashMenu";

/**
 * Walk visible text nodes inside a block element until we accumulate
 * `charOffset` characters of plain text. Skips text inside non-text inline
 * content (e.g. citations) so the offset matches the source-map offset
 * produced by the serializer.
 */
function findOffsetTextNode(
  blockEl: HTMLElement,
  charOffset: number
): { node: Text; offset: number } | null {
  const contentEl =
    blockEl.querySelector<HTMLElement>(".bn-inline-content") ?? blockEl;

  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p: Node | null = node.parentNode;
      while (p && p !== contentEl) {
        if (p instanceof HTMLElement) {
          const t = p.dataset.inlineContentType;
          if (t && t !== "text") return NodeFilter.FILTER_REJECT;
        }
        p = p.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let remaining = charOffset;
  let last: { node: Text; offset: number } | null = null;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    last = { node, offset: len };
    if (remaining <= len) {
      return { node, offset: remaining };
    }
    remaining -= len;
    node = walker.nextNode() as Text | null;
  }
  // Offset overruns the block — clamp to the end of the last text node.
  return last;
}

function getLineHighlightMetrics(
  blockEl: HTMLElement,
  placement?: { node: Text; offset: number } | null,
  range?: Range | null
) {
  const contentEl =
    blockEl.querySelector<HTMLElement>(".bn-block-content") ?? blockEl;
  const blockRect = contentEl.getBoundingClientRect();

  const tryRect = (candidate: Range | null | undefined) => {
    if (!candidate) return null;
    const rects = Array.from(candidate.getClientRects());
    const rect = rects.find((item) => item.height > 0) ?? candidate.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return null;
    }
    return rect;
  };

  let rect = tryRect(range);

  if (!rect && placement) {
    const probe = document.createRange();
    const textLength = placement.node.data.length;

    if (textLength > 0) {
      if (placement.offset < textLength) {
        probe.setStart(placement.node, placement.offset);
        probe.setEnd(placement.node, Math.min(textLength, placement.offset + 1));
      } else {
        probe.setStart(placement.node, Math.max(0, placement.offset - 1));
        probe.setEnd(placement.node, placement.offset);
      }
      rect = tryRect(probe);
    }
  }

  if (!rect && placement?.node.parentElement) {
    rect = placement.node.parentElement.getBoundingClientRect();
  }

  if (!rect) {
    const contentEl =
      blockEl.querySelector<HTMLElement>(".bn-inline-content") ?? blockEl;
    rect = contentEl.getBoundingClientRect();
  }

  const lineHeightSource =
    placement?.node.parentElement ??
    blockEl.querySelector<HTMLElement>(".bn-inline-content") ??
    contentEl;
  const computedLineHeight = parseFloat(getComputedStyle(lineHeightSource).lineHeight);
  const height = Math.max(
    22,
    Number.isFinite(computedLineHeight) ? computedLineHeight : 24,
    rect.height || 0
  );
  const top = Math.max(0, rect.top - blockRect.top);

  return { top, height, contentRect: blockRect };
}

/**
 * Briefly highlight the visual line that contains the current caret,
 * then fade it out. Uses an absolutely-positioned overlay inside the
 * block element so it scrolls naturally with the content.
 */
function flashCurrentLine(
  containerEl: HTMLElement,
  blockEl: HTMLElement,
  placement?: { node: Text; offset: number } | null,
  range?: Range | null
) {
  const metrics = getLineHighlightMetrics(blockEl, placement, range);
  if (!metrics) return;
  const containerRect = containerEl.getBoundingClientRect();
  const left =
    containerEl.scrollLeft + metrics.contentRect.left - containerRect.left - 10;
  const top =
    containerEl.scrollTop + metrics.contentRect.top - containerRect.top + metrics.top;
  const width = metrics.contentRect.width + 20;

  const highlight = document.createElement("div");
  highlight.className = "lextyp-line-highlight";
  highlight.style.left = `${left}px`;
  highlight.style.top = `${top}px`;
  highlight.style.width = `${width}px`;
  highlight.style.height = `${metrics.height}px`;
  containerEl.appendChild(highlight);
  window.setTimeout(() => {
    highlight.remove();
  }, 1700);
}

function placeCaretAndHighlight(
  editor: any,
  containerEl: HTMLElement | null,
  blockEl: HTMLElement,
  placement: { node: Text; offset: number } | null
) {
  if (!placement) {
    if (containerEl) {
      flashCurrentLine(containerEl, blockEl, null, null);
    }
    return;
  }

  const range = document.createRange();
  range.setStart(placement.node, placement.offset);
  range.collapse(true);

  try {
    const view = editor?.prosemirrorView;
    if (view) {
      const pos = view.posAtDOM(placement.node, placement.offset);
      if (typeof pos === "number" && pos >= 0) {
        const tiptap = editor?._tiptapEditor;
        tiptap?.commands?.setTextSelection?.(pos);
        tiptap?.commands?.focus?.();
      }
    }
  } catch {
    // Fall through to DOM selection below.
  }

  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }

  try {
    editor?.focus?.();
  } catch {
    // Ignore if not yet mounted.
  }

  if (containerEl) {
    flashCurrentLine(containerEl, blockEl, placement, range);
  }
}

export function Editor() {
  // Only subscribe to actions from app-store — never re-render on compile state changes
  const setCompiling = useAppStore((s) => s.setCompiling);
  const setCompilationResult = useAppStore((s) => s.setCompilationResult);
  const setCompilationError = useAppStore((s) => s.setCompilationError);

  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [citationPickerOpen, setCitationPickerOpen] = useState(false);
  const loadedPathRef = useRef<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

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

  const setSourceMap = useAppStore((s) => s.setSourceMap);

  const compileDocument = useCallback(async () => {
    try {
      const blocks = editor.document;
      const formatter = getFormatter(useReferenceStore.getState().citationStyle);
      const { entries } = useReferenceStore.getState();
      const source = serializeToTypst(blocks as any, entries, formatter, true);
      setCompiling(true);

      const result = await invoke<{ pdf_base64: string; duration_ms: number }>(
        "compile_typst",
        { content: source }
      );
      setCompilationResult(result.pdf_base64, result.duration_ms);

      // Query block positions from the compiled file
      try {
        const map = await invoke<
          { id: string; off: number; page: number; x: number; y: number }[]
        >("query_source_map");
        setSourceMap(map);
      } catch {
        // Non-critical — source map just won't be available
      }
    } catch (err: any) {
      setCompilationError(String(err), 0);
    }
  }, [editor, setCompiling, setCompilationResult, setCompilationError, setSourceMap]);

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

  // Compile when the active document or citation rendering inputs change.
  // The PDF depends on bibliography entries and citation style in addition to
  // editor blocks, so those changes need to trigger a refresh as well.
  useEffect(() => {
    if (!activeDocumentPath) return;
    const timer = setTimeout(compileDocument, 250);
    return () => clearTimeout(timer);
  }, [activeDocumentPath, citationStyle, entries, compileDocument]);

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
      // Re-focus so the cursor stays visible after inserting the citation
      try {
        editor.focus();
      } catch {
        // Ignore if not yet mounted
      }
    },
    [editor]
  );

  const jumpToBlock = useCallback(
    (blockId: string, charOffset: number = 0) => {
      const block = editor.getBlock(blockId);
      if (!block) return;

      // Place the cursor near the target as a sane initial state, then
      // focus so the caret actually blinks (otherwise it stays invisible).
      editor.setTextCursorPosition(block, "start");
      try {
        editor.focus();
      } catch {
        // BlockNote may throw if not yet mounted — ignore.
      }

      // After the editor has had a chance to render the focused block,
      // walk the DOM to the precise character and move the PM selection
      // there, then flash the line that contains it.
      requestAnimationFrame(() => {
        const blockEl = document.querySelector<HTMLElement>(`[data-id="${blockId}"]`);
        if (!blockEl) return;
        blockEl.scrollIntoView({ block: "center", inline: "nearest" });

        requestAnimationFrame(() => {
          const placement = findOffsetTextNode(blockEl, charOffset);
          placeCaretAndHighlight(
            editor as any,
            editorContainerRef.current,
            blockEl,
            placement
          );
        });
      });
    },
    [editor]
  );

  useEffect(() => {
    (window as any).__lextyp_insertCitation = insertCitation;
    (window as any).__lextyp_openCitationPicker = openCitationPicker;
    (window as any).__lextyp_jumpToBlock = jumpToBlock;
    return () => {
      delete (window as any).__lextyp_insertCitation;
      delete (window as any).__lextyp_openCitationPicker;
      delete (window as any).__lextyp_jumpToBlock;
    };
  }, [insertCitation, openCitationPicker, jumpToBlock]);

  return (
    <div className="h-full overflow-auto relative" ref={editorContainerRef}>
      <div className="max-w-[880px] mx-auto px-8 py-10">
        <BlockNoteView
          editor={editor}
          theme="light"
          formattingToolbar={false}
          slashMenu={false}
          sideMenu={false}
          onChange={handleChange}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(getSlashMenuItems(editor, openCitationPicker), query)
            }
            suggestionMenuComponent={SlashMenu}
          />
          <SideMenuController sideMenu={EditorSideMenu} />
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
