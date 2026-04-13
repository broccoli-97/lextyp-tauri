import type { BibEntry, CitationHistoryEntry } from "../types/bib";
import type { CitationFormatter } from "./citation/formatter";

/**
 * Serialize BlockNote document to Typst source.
 * Citation @keys are expanded to #footnote[...] using the active formatter.
 * When `trackBlocks` is true, each block is wrapped with a metadata tracker
 * so that `typst query` can return page positions for each block.
 */
export function serializeToTypst(
  blocks: any[],
  entries?: BibEntry[],
  formatter?: CitationFormatter,
  trackBlocks = false
): string {
  let output = "";

  // Preamble
  output += '#set page(paper: "a4", margin: 2cm)\n';
  output += "#set text(size: 11pt)\n";
  output += "#set par(justify: true, leading: 0.65em)\n";

  // Block-tracking helpers — emit invisible metadata that `typst query` can extract.
  // `__track` records the start of a block (off=0); `__w` records each word's
  // position within the block, where `off` is the character offset in the
  // block's *raw* text (before escaping / style markup).
  if (trackBlocks) {
    output += '#let __track(id, body) = context { metadata((id: id, off: 0, pos: here().position())); body }\n';
    output += '#let __w(id, off) = context { metadata((id: id, off: off, pos: here().position())); }\n';
  }

  output += "\n";

  const history: CitationHistoryEntry[] = [];
  let footnoteCounter = 0;

  for (const block of blocks) {
    const blockContent = serializeBlock(
      block,
      entries,
      formatter,
      history,
      footnoteCounter,
      trackBlocks ? block.id : undefined
    );
    if (trackBlocks && block.id && blockContent.trim()) {
      // Wrap in tracker: #__track("blockId")[<content>]
      // Strip trailing newlines from content for wrapping, then re-add them
      const trimmed = blockContent.replace(/\n+$/, "");
      const trailing = blockContent.slice(trimmed.length);
      output += `#__track("${block.id}")[${trimmed}]${trailing}`;
    } else {
      output += blockContent;
    }
    // Count footnotes produced in this block
    const content = Array.isArray(block.content) ? block.content : [];
    for (const item of content) {
      if (item.type === "citation" && item.props?.key) {
        footnoteCounter++;
      }
    }
  }

  return output;
}

function serializeBlock(
  block: any,
  entries?: BibEntry[],
  formatter?: CitationFormatter,
  history?: CitationHistoryEntry[],
  fnStart?: number,
  trackBlockId?: string
): string {
  const content = Array.isArray(block.content) ? block.content : [];

  switch (block.type) {
    case "heading": {
      const level = block.props?.level ?? 1;
      const prefix = "=".repeat(level);
      const text = serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId);
      return `${prefix} ${text}\n`;
    }
    case "paragraph": {
      const text = serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId);
      if (!text.trim()) return "\n";
      return text + "\n\n";
    }
    case "bulletListItem":
      return `- ${serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId)}\n`;
    case "numberedListItem":
      return `+ ${serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId)}\n`;
    case "checkListItem": {
      const checked = block.props?.checked ? "[x]" : "[ ]";
      return `- ${checked} ${serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId)}\n`;
    }
    default:
      if (content.length > 0) {
        return serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId) + "\n\n";
      }
      return "";
  }
}

function serializeInlineContent(
  content: any[],
  entries?: BibEntry[],
  formatter?: CitationFormatter,
  history?: CitationHistoryEntry[],
  fnStart?: number,
  trackBlockId?: string
): string {
  if (!content || !Array.isArray(content)) return "";

  let fnCounter = fnStart ?? 0;
  // Character offset within the block's *raw* (unescaped, unstyled) text.
  // Used to emit `#__w` markers for word-level position queries. Citations
  // and other non-text inline content do not advance this counter so the
  // offset stays in sync with what we walk in the editor DOM later.
  let charOffset = 0;
  let out = "";

  for (const item of content) {
    if (item.type === "text") {
      const rawText: string = item.text ?? "";
      if (!rawText) continue;
      const styles = item.styles ?? {};

      if (trackBlockId) {
        // Split into alternating runs of whitespace and non-whitespace.
        // Emit a position marker before each non-whitespace run (a "word").
        const tokens = rawText.match(/\s+|\S+/g) ?? [];
        for (const token of tokens) {
          if (/\S/.test(token)) {
            out += `#__w("${trackBlockId}",${charOffset});`;
            out += applyTextStyles(escapeTypst(token), styles);
          } else {
            // Whitespace stays outside style markers so adjacent styled
            // words don't visually run into each other.
            out += escapeTypst(token);
          }
          charOffset += token.length;
        }
      } else {
        out += serializeStyledText(item);
      }
      continue;
    }

    if (item.type === "citation") {
      const key = item.props?.key ?? "";
      if (!key) continue;

      // If we have a formatter and entries, produce a proper footnote
      if (formatter && entries) {
        const entry = entries.find((e) => e.key === key);
        if (entry) {
          fnCounter++;
          const footnoteText = formatter.formatFootnote(
            entry, "", history ?? [], fnCounter
          );
          if (history) {
            history.push({ key, footnoteNumber: fnCounter });
          }
          out += `#footnote[${footnoteText}]`;
          continue;
        }
      }

      // Fallback: Typst native cite syntax
      out += `#cite(<${key}>)`;
      continue;
    }

    if (item.type === "link") {
      const href = item.href ?? "";
      const linkText = item.content
        ? item.content.map((c: any) => c.text ?? "").join("")
        : href;
      if (trackBlockId && linkText) {
        out += `#__w("${trackBlockId}",${charOffset});`;
      }
      out += `#link("${href}")[${escapeTypst(linkText)}]`;
      charOffset += linkText.length;
      continue;
    }

    out += item.text ?? "";
  }

  return out;
}

function applyTextStyles(text: string, styles: any): string {
  if (styles.bold) text = `*${text}*`;
  if (styles.italic) text = `_${text}_`;
  if (styles.code) text = `\`${text}\``;
  if (styles.strikethrough) text = `#strike[${text}]`;
  if (styles.underline) text = `#underline[${text}]`;
  return text;
}

/**
 * Escape Typst special characters so body text renders literally.
 * Characters escaped: \ # * _ ` $ @ < > ~ = /
 * The `=` is only special at line start (headings) but we escape it
 * everywhere for safety since inline `=` is harmless when escaped.
 */
function escapeTypst(text: string): string {
  // Escape backslash first, then all other specials
  return text.replace(/[\\#*_`$@<>~=/]/g, (ch) => `\\${ch}`);
}

function serializeStyledText(item: any): string {
  let text: string = item.text ?? "";
  if (!text) return "";

  const styles = item.styles ?? {};

  // Escape special characters in the raw text
  text = escapeTypst(text);

  // Apply styling AFTER escaping — these are intentional Typst markup
  if (styles.bold) text = `*${text}*`;
  if (styles.italic) text = `_${text}_`;
  if (styles.code) text = `\`${text}\``;
  if (styles.strikethrough) text = `#strike[${text}]`;
  if (styles.underline) text = `#underline[${text}]`;

  return text;
}
