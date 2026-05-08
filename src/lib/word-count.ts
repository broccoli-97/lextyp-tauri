/**
 * Word counting for the BlockNote document tree.
 *
 * Two values are produced:
 *   - `totalWords`  — every authored word in the document, with
 *     `documentInclude` blocks expanded to their referenced files.
 *   - `cursorWords` — words from the start of the document up to (and
 *     including) the user's caret. Walks blocks in the same DFS order the
 *     editor renders, so the count advances naturally as the cursor moves.
 *
 * Citations and the `tableOfContents` block contribute zero — they are
 * either rendered later from metadata (footnotes, bibliography, TOC) or are
 * non-authored placeholders.
 */

const includeCountCache = new Map<string, number>();

export type IncludeLoader = (path: string) => Promise<{ blocks: any[] }>;

export interface CursorPosition {
  blockId: string;
  /** Character offset within the block's *raw text* (text inline content
   *  only — citations and other inline atoms do not advance this counter,
   *  matching how the editor's source-map walker computes offsets). */
  charOffset: number;
}

/** Walk `blocks` and ensure every referenced documentInclude has its word
 *  count cached. Recurses into nested includes; cycles are guarded by a
 *  visited set. After this resolves, `countWordsAndCursor` will see the
 *  freshly cached counts.
 */
export async function preloadIncludeCounts(
  blocks: any[] | null | undefined,
  loader: IncludeLoader
): Promise<void> {
  await walkAndLoad(blocks, loader, new Set());
}

async function walkAndLoad(
  blocks: any[] | null | undefined,
  loader: IncludeLoader,
  visited: Set<string>
): Promise<void> {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (block?.type === "documentInclude") {
      const path = String(block?.props?.path ?? "");
      if (!path || visited.has(path)) continue;
      visited.add(path);
      if (!includeCountCache.has(path)) {
        try {
          const result = await loader(path);
          // Resolve nested includes first so this doc's count is fully formed.
          await walkAndLoad(result.blocks, loader, visited);
          includeCountCache.set(path, sumDocument(result.blocks));
        } catch {
          includeCountCache.set(path, 0);
        }
      }
    }
    if (Array.isArray(block?.children)) {
      await walkAndLoad(block.children, loader, visited);
    }
  }
}

/** Clear the include cache. Call when switching workspaces or when the user
 *  explicitly wants a fresh load (we cache for the session otherwise). */
export function clearIncludeCountCache() {
  includeCountCache.clear();
}

/**
 * Compute (cursorWords, totalWords) for the current document. The include
 * cache is consulted synchronously — paths that haven't been preloaded
 * contribute 0; call `preloadIncludeCounts` first (and recompute on
 * resolution) to surface them.
 */
export function countWordsAndCursor(
  blocks: any[] | null | undefined,
  cursor: CursorPosition | null
): { cursorWords: number; totalWords: number } {
  if (!Array.isArray(blocks)) return { cursorWords: 0, totalWords: 0 };

  let cursorWords = 0;
  let totalWords = 0;
  let seenCursor = false;

  function walk(items: any[]) {
    for (const block of items) {
      const isInclude = block?.type === "documentInclude";
      const fullCount = isInclude
        ? includeCountCache.get(String(block?.props?.path ?? "")) ?? 0
        : countTextInline(block?.content);

      if (
        cursor &&
        !seenCursor &&
        !isInclude &&
        block?.id === cursor.blockId
      ) {
        cursorWords += countTextInlineUpTo(block?.content, cursor.charOffset);
        seenCursor = true;
      } else if (!seenCursor) {
        cursorWords += fullCount;
      }
      totalWords += fullCount;

      if (!isInclude && Array.isArray(block?.children)) {
        walk(block.children);
      }
    }
  }
  walk(blocks);

  // Cursor not encountered (e.g. focus is in a block id we couldn't match,
  // or there's no cursor at all): clamp to total so the display never shows
  // a partial count larger than the whole.
  if (!seenCursor) cursorWords = totalWords;

  return { cursorWords, totalWords };
}

/** Sum every word in `blocks`, expanding includes from the cache. Used both
 *  by `countWordsAndCursor` (indirectly) and by `preloadIncludeCounts` to
 *  build the cache entry for a freshly loaded include. */
function sumDocument(blocks: any[] | null | undefined): number {
  if (!Array.isArray(blocks)) return 0;
  let total = 0;
  for (const block of blocks) {
    if (block?.type === "documentInclude") {
      total += includeCountCache.get(String(block?.props?.path ?? "")) ?? 0;
      continue;
    }
    total += countTextInline(block?.content);
    if (Array.isArray(block?.children)) total += sumDocument(block.children);
  }
  return total;
}

function countTextInline(content: any): number {
  if (!Array.isArray(content)) return 0;
  let total = 0;
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "text" && typeof item.text === "string") {
      total += tokenize(item.text);
    } else if (item.type === "link" && Array.isArray(item.content)) {
      total += countTextInline(item.content);
    }
    // citation, etc. — intentionally skipped
  }
  return total;
}

/** Count words in `content` up to `charOffset` characters of raw text.
 *  Citations contribute 0 chars (matching the source-map's offset model);
 *  link content is treated as inline text so its chars count. */
function countTextInlineUpTo(content: any, charOffset: number): number {
  if (!Array.isArray(content) || charOffset <= 0) return 0;
  let words = 0;
  let chars = 0;

  const visit = (items: any[]): boolean => {
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      if (item.type === "text" && typeof item.text === "string") {
        const text = item.text;
        const remaining = charOffset - chars;
        if (remaining <= 0) return true;
        if (text.length <= remaining) {
          words += tokenize(text);
          chars += text.length;
        } else {
          words += tokenize(text.slice(0, remaining));
          chars = charOffset;
          return true;
        }
      } else if (item.type === "link" && Array.isArray(item.content)) {
        if (visit(item.content)) return true;
      }
      // citation, etc. — does not advance chars
    }
    return false;
  };
  visit(content);
  return words;
}

function tokenize(text: string): number {
  const matches = text.match(/\S+/g);
  return matches ? matches.length : 0;
}
