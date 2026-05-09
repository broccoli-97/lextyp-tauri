import "@blocknote/core/fonts/inter.css";
import { FormattingToolbarController, SideMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { SuggestionMenuController } from "@blocknote/react";
import { flip, offset, shift, size } from "@floating-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { schema } from "../editor/schema";
import { getSlashMenuItems } from "../editor/slash-items";
import { serializeToTypst } from "../lib/typst-serializer";
import { getFormatter } from "../lib/citation/registry";
import { t } from "../lib/i18n";
import { formatAutoDate } from "../lib/date-format";
import { useSettingsStore } from "../stores/settings-store";
import {
  clearIncludeCountCache,
  countWordsAndCursor,
  preloadIncludeCounts,
  type CursorPosition,
  type IncludeLoader,
} from "../lib/word-count";
import { useAppStore } from "../stores/app-store";
import { useReferenceStore } from "../stores/reference-store";
import { useWorkspaceStore, makeIncludeResolver } from "../stores/workspace-store";
import { FloatingOutline } from "./FloatingOutline";
import { CitationPicker } from "./CitationPicker";
import { CoverPageDialog } from "./CoverPageDialog";
import { DocumentPicker } from "./DocumentPicker";
import { EditorSideMenu } from "./EditorSideMenu";
import { EditorFormattingToolbar } from "./EditorFormattingToolbar";
import { EditorTopToolbar } from "./EditorTopToolbar";
import { SlashMenu } from "./SlashMenu";

// Slash-menu placement: BlockNote's defaults only flip vertically, so when the
// caret sits near the right edge of the editor pane the 340px popup spills past
// the gutter. Allow corner flips and add a viewport-padded shift so it always
// lands inside the editor area; size() caps the height to whatever's available.
const SLASH_MENU_FLOATING_OPTIONS = {
  useFloatingOptions: {
    placement: "bottom-start" as const,
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ["bottom-end", "top-start", "top-end"],
        padding: 12,
      }),
      shift({ padding: 12 }),
      size({
        apply({ elements, availableHeight, availableWidth }) {
          elements.floating.style.maxHeight = `${Math.max(160, availableHeight)}px`;
          elements.floating.style.maxWidth = `${Math.max(240, availableWidth)}px`;
        },
        padding: 12,
      }),
    ],
  },
};

// Side-menu (drag/add handle) placement: BlockNote defaults to "left-start"
// which top-aligns the handle with the block's bounding box. For headings,
// the larger line-height pushes the visible glyphs down past the handle, so
// the handle reads as "above" the text and — once the body switched to a
// serif with looser leading — it landed visibly off-line. Centering on the
// cross-axis lets the handle settle on the block's optical midpoint, which
// for one-to-two line blocks (the academic-prose norm) lines up with the
// text baseline cleanly for both paragraphs and headings.
const SIDE_MENU_FLOATING_OPTIONS = {
  useFloatingOptions: {
    placement: "left" as const,
  },
};

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
  const setWordCounts = useAppStore((s) => s.setWordCounts);
  const cursorRef = useRef<CursorPosition | null>(null);

  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [citationPickerOpen, setCitationPickerOpen] = useState(false);
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [coverPageDialogBlock, setCoverPageDialogBlock] = useState<any | null>(null);
  const loadedPathRef = useRef<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useCreateBlockNote({ schema });
  // Only subscribe to the specific values needed from reference-store
  const entries = useReferenceStore((s) => s.entries);
  const citationStyle = useReferenceStore((s) => s.citationStyle);
  const citationDisplay = useReferenceStore((s) => s.citationDisplay);
  // Only subscribe to the specific values needed from workspace-store
  const activeDocumentPath = useWorkspaceStore((s) => s.activeDocumentPath);
  const activeDocumentBlocks = useWorkspaceStore((s) => s.activeDocumentBlocks);
  const fileTree = useWorkspaceStore((s) => s.fileTree);
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const setDirty = useWorkspaceStore((s) => s.setDirty);
  const setEditorInstance = useWorkspaceStore((s) => s.setEditorInstance);
  const saveActiveDocument = useWorkspaceStore((s) => s.saveActiveDocument);

  // Register editor instance with workspace store
  useEffect(() => {
    setEditorInstance(editor);
    return () => setEditorInstance(null);
  }, [editor, setEditorInstance]);

  // Swallow BlockNote shortcuts for features this app doesn't support, so
  // they never reach ProseMirror. We use capture phase and stopPropagation
  // but skip preventDefault for Tab so it falls through to native focus move.
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Tab / Shift+Tab — nest/unnest. Block PM handler; let browser keep
      // its default (focus move) by not preventing the event.
      if (e.key === "Tab") {
        e.stopPropagation();
        return;
      }

      const block =
        // Mod+E — inline code
        (mod && !e.shiftKey && !e.altKey && key === "e") ||
        // Mod+Alt+c (code block) / Mod+Alt+q (quote)
        (mod && e.altKey && !e.shiftKey && (key === "c" || key === "q")) ||
        // Mod+Alt+5 / Mod+Alt+6 — heading levels we don't ship
        (mod && e.altKey && !e.shiftKey && (key === "5" || key === "6")) ||
        // Mod+Shift+L/E/R/J — text alignment
        (mod && e.shiftKey && !e.altKey && (key === "l" || key === "e" || key === "r" || key === "j"));

      if (block) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    container.addEventListener("keydown", onKeyDown, true);
    return () => container.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const openCitationPicker = useCallback(() => {
    setCitationPickerOpen(true);
  }, []);

  const closeCitationPicker = useCallback(() => {
    setCitationPickerOpen(false);
  }, []);

  const openDocumentPicker = useCallback(() => {
    setDocumentPickerOpen(true);
  }, []);

  const closeDocumentPicker = useCallback(() => {
    setDocumentPickerOpen(false);
  }, []);

  const setSourceMap = useAppStore((s) => s.setSourceMap);

  /** Resolve the caret to (block id, raw-text char offset) by walking the
   *  same accepted text nodes as `findOffsetTextNode` (citation atoms are
   *  rejected so the offset stays in sync with the source-map model). */
  const readCursorFromDOM = useCallback((): CursorPosition | null => {
    const container = editorContainerRef.current;
    if (!container) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const anchor = range.startContainer;
    if (!container.contains(anchor)) return null;

    let blockEl: HTMLElement | null = null;
    let n: Node | null = anchor;
    while (n) {
      if (n instanceof HTMLElement && n.dataset.id) {
        blockEl = n;
        break;
      }
      n = n.parentNode;
    }
    if (!blockEl) return null;

    const contentEl =
      blockEl.querySelector<HTMLElement>(".bn-inline-content") ?? blockEl;

    // If the caret sits outside an accepted text region (e.g. at the very
    // edge of an empty block), treat it as offset 0 inside the block.
    if (!contentEl.contains(anchor)) {
      return { blockId: blockEl.dataset.id!, charOffset: 0 };
    }

    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        let p: Node | null = node.parentNode;
        while (p && p !== contentEl) {
          if (p instanceof HTMLElement) {
            const tag = p.dataset.inlineContentType;
            if (tag && tag !== "text") return NodeFilter.FILTER_REJECT;
          }
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let offset = 0;
    let node = walker.nextNode() as Text | null;
    while (node) {
      if (node === anchor) {
        return {
          blockId: blockEl.dataset.id!,
          charOffset: offset + range.startOffset,
        };
      }
      offset += node.data.length;
      node = walker.nextNode() as Text | null;
    }
    return { blockId: blockEl.dataset.id!, charOffset: offset };
  }, []);

  const includeLoader = useCallback<IncludeLoader>(async (path) => {
    const resolver = makeIncludeResolver();
    const result = await resolver(path);
    return { blocks: result.blocks ?? [] };
  }, []);

  const recomputeCounts = useCallback(() => {
    const { cursorWords, totalWords } = countWordsAndCursor(
      editor.document as any,
      cursorRef.current
    );
    setWordCounts(
      cursorRef.current ? cursorWords : null,
      totalWords
    );
  }, [editor, setWordCounts]);

  /** Walk the current document for new include paths, load their counts,
   *  then refresh totals. The synchronous `recomputeCounts` runs first so
   *  the chip updates immediately (with stale include counts if any), then
   *  again after the loader resolves. */
  const refreshIncludeCounts = useCallback(() => {
    preloadIncludeCounts(editor.document as any, includeLoader)
      .then(recomputeCounts)
      .catch(() => {
        // Loader errors are already swallowed inside preloadIncludeCounts.
      });
  }, [editor, includeLoader, recomputeCounts]);

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

    // Switching documents may bring in a different set of includes (or new
    // versions of the same paths if the user edited an include in another
    // tab). Wipe the cache and rebuild for this document.
    cursorRef.current = null;
    clearIncludeCountCache();
    recomputeCounts();
    refreshIncludeCounts();
  }, [activeDocumentPath, activeDocumentBlocks, editor, recomputeCounts, refreshIncludeCounts]);

  const compileDocument = useCallback(async () => {
    try {
      const blocks = editor.document;
      const formatter = getFormatter(useReferenceStore.getState().citationStyle);
      const { entries } = useReferenceStore.getState();
      const source = await serializeToTypst(
        blocks as any,
        entries,
        formatter,
        true,
        makeIncludeResolver(),
        t("doc.references"),
        formatAutoDate(useSettingsStore.getState().locale)
      );
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

    // Live word counts. The cursor offset shifts during typing, so refresh
    // it before the count walk; include counts are picked up asynchronously
    // (newly inserted /include blocks will surface after the loader resolves).
    cursorRef.current = readCursorFromDOM() ?? cursorRef.current;
    recomputeCounts();
    refreshIncludeCounts();

    // Debounced compile (400ms)
    if (compileTimerRef.current) clearTimeout(compileTimerRef.current);
    compileTimerRef.current = setTimeout(compileDocument, 400);

    // Debounced auto-save (2s)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveActiveDocument().catch(console.error);
    }, 2000);
  }, [
    compileDocument,
    setDirty,
    saveActiveDocument,
    readCursorFromDOM,
    recomputeCounts,
    refreshIncludeCounts,
  ]);

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

  // Track caret movement so the cursor word count tracks arrow-key navigation,
  // mouse clicks, and any other selection change — not just edits. The native
  // `selectionchange` event fires for every caret update; we filter to events
  // that land inside this editor and ignore everything else.
  useEffect(() => {
    const onSelectionChange = () => {
      const next = readCursorFromDOM();
      if (!next) return;
      cursorRef.current = next;
      recomputeCounts();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [readCursorFromDOM, recomputeCounts]);

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

  const insertDocumentInclude = useCallback(
    (path: string, title: string) => {
      const cursor = editor.getTextCursorPosition();
      editor.insertBlocks(
        [
          {
            type: "documentInclude",
            props: { path, title },
          } as any,
        ],
        cursor.block,
        "after"
      );
      setDocumentPickerOpen(false);
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

  const openCoverPageDialog = useCallback((block: any) => {
    setCoverPageDialogBlock(block);
  }, []);

  const closeCoverPageDialog = useCallback(() => {
    setCoverPageDialogBlock(null);
  }, []);

  useEffect(() => {
    (window as any).__lextyp_insertCitation = insertCitation;
    (window as any).__lextyp_openCitationPicker = openCitationPicker;
    (window as any).__lextyp_openDocumentPicker = openDocumentPicker;
    (window as any).__lextyp_openCoverPageDialog = openCoverPageDialog;
    (window as any).__lextyp_jumpToBlock = jumpToBlock;
    return () => {
      delete (window as any).__lextyp_insertCitation;
      delete (window as any).__lextyp_openCitationPicker;
      delete (window as any).__lextyp_openDocumentPicker;
      delete (window as any).__lextyp_openCoverPageDialog;
      delete (window as any).__lextyp_jumpToBlock;
    };
  }, [insertCitation, openCitationPicker, openDocumentPicker, openCoverPageDialog, jumpToBlock]);

  return (
    <div className="h-full relative flex flex-col">
      <EditorTopToolbar
        editor={editor}
        onInsertCitation={openCitationPicker}
      />
      {/* `relative` is required: flashCurrentLine appends an absolutely-
          positioned overlay to this element with coordinates computed
          relative to its scroll origin. Without a positioned ancestor
          here, the overlay would resolve against the viewport (or some
          ancestor) and land on the wrong row. */}
      <div className="flex-1 min-h-0 overflow-auto relative" ref={editorContainerRef} onContextMenu={(e) => e.preventDefault()}>
        <div className={`editor-content-wrap editor-citations-${citationDisplay}`}>
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
                filterSuggestionItems(
                  getSlashMenuItems(editor, openCitationPicker, openDocumentPicker),
                  query
                )
              }
              suggestionMenuComponent={SlashMenu}
              floatingUIOptions={SLASH_MENU_FLOATING_OPTIONS}
            />
            <FormattingToolbarController formattingToolbar={EditorFormattingToolbar} />
            <SideMenuController
              sideMenu={EditorSideMenu}
              floatingUIOptions={SIDE_MENU_FLOATING_OPTIONS}
            />
          </BlockNoteView>
        </div>
      </div>
      {/* Outline sits outside the scroll container so it stays pinned at the
          top-right while the user scrolls through the document. */}
      <FloatingOutline editor={editor} />
      <CitationPicker
        open={citationPickerOpen}
        entries={entries}
        formatter={getFormatter(citationStyle)}
        onClose={closeCitationPicker}
        onSelect={insertCitation}
      />
      <DocumentPicker
        open={documentPickerOpen}
        fileTree={fileTree}
        workspacePath={workspacePath}
        currentDocumentPath={activeDocumentPath}
        onClose={closeDocumentPicker}
        onSelect={insertDocumentInclude}
      />
      <CoverPageDialog
        open={coverPageDialogBlock !== null}
        block={coverPageDialogBlock}
        editor={editor}
        onClose={closeCoverPageDialog}
      />
    </div>
  );
}
