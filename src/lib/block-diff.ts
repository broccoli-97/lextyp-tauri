export interface TextDiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
}

export interface DiffEntry {
  blockId: string;
  type: "added" | "removed" | "modified" | "unchanged";
  oldBlock?: any;
  newBlock?: any;
  textDiff?: TextDiffSegment[];
}

/** Extract plain text from a BlockNote block's content array. */
function blockText(block: any): string {
  if (!block?.content || !Array.isArray(block.content)) return "";
  return block.content
    .map((item: any) => {
      if (item.type === "text") return item.text ?? "";
      if (item.type === "citation") return `@${item.props?.key ?? ""}`;
      return "";
    })
    .join("");
}

/** Simple word-level diff using LCS. */
function diffWords(oldText: string, newText: string): TextDiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const m = oldWords.length;
  const n = newWords.length;

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const segments: TextDiffSegment[] = [];
  let i = m;
  let j = n;
  const stack: TextDiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      stack.push({ type: "equal", text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "added", text: newWords[j - 1] });
      j--;
    } else {
      stack.push({ type: "removed", text: oldWords[i - 1] });
      i--;
    }
  }

  // Reverse and merge consecutive same-type segments
  stack.reverse();
  for (const seg of stack) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

/** Deep-compare two blocks' content (ignoring children). */
function contentEqual(a: any, b: any): boolean {
  return JSON.stringify(a?.content) === JSON.stringify(b?.content);
}

/**
 * Compute a block-level diff between two BlockNote document arrays.
 * Matches blocks by their `id` field.
 */
export function computeBlockDiff(
  baseBlocks: any[],
  targetBlocks: any[]
): DiffEntry[] {
  const baseMap = new Map<string, any>();
  for (const block of baseBlocks) {
    if (block.id) baseMap.set(block.id, block);
  }

  const targetMap = new Map<string, any>();
  for (const block of targetBlocks) {
    if (block.id) targetMap.set(block.id, block);
  }

  const result: DiffEntry[] = [];
  const processed = new Set<string>();

  // Walk target blocks in order to preserve visual ordering
  for (const block of targetBlocks) {
    const id = block.id;
    if (!id) continue;
    processed.add(id);

    const oldBlock = baseMap.get(id);
    if (!oldBlock) {
      result.push({ blockId: id, type: "added", newBlock: block });
    } else if (contentEqual(oldBlock, block)) {
      result.push({ blockId: id, type: "unchanged", oldBlock, newBlock: block });
    } else {
      const oldText = blockText(oldBlock);
      const newText = blockText(block);
      const textDiff = diffWords(oldText, newText);
      result.push({
        blockId: id,
        type: "modified",
        oldBlock,
        newBlock: block,
        textDiff,
      });
    }
  }

  // Blocks only in base (removed)
  for (const block of baseBlocks) {
    if (block.id && !processed.has(block.id)) {
      result.push({ blockId: block.id, type: "removed", oldBlock: block });
    }
  }

  return result;
}
