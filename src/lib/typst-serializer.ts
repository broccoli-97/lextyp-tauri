import type { BibEntry, CitationHistoryEntry } from "../types/bib";
import type { CitationFormatter } from "./citation/formatter";

/**
 * Serialize BlockNote document to Typst source.
 * Citation @keys are expanded to #footnote[...] using the active formatter.
 */
export function serializeToTypst(
  blocks: any[],
  entries?: BibEntry[],
  formatter?: CitationFormatter
): string {
  let output = "";

  // Preamble
  output += '#set page(paper: "a4", margin: 2cm)\n';
  output += "#set text(size: 11pt)\n";
  output += "#set par(justify: true, leading: 0.65em)\n\n";

  const history: CitationHistoryEntry[] = [];
  let footnoteCounter = 0;

  for (const block of blocks) {
    output += serializeBlock(block, entries, formatter, history, footnoteCounter);
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
  fnStart?: number
): string {
  const content = Array.isArray(block.content) ? block.content : [];

  switch (block.type) {
    case "heading": {
      const level = block.props?.level ?? 1;
      const prefix = "=".repeat(level);
      const text = serializeInlineContent(content, entries, formatter, history, fnStart);
      return `${prefix} ${text}\n`;
    }
    case "paragraph": {
      const text = serializeInlineContent(content, entries, formatter, history, fnStart);
      if (!text.trim()) return "\n";
      return text + "\n\n";
    }
    case "bulletListItem":
      return `- ${serializeInlineContent(content, entries, formatter, history, fnStart)}\n`;
    case "numberedListItem":
      return `+ ${serializeInlineContent(content, entries, formatter, history, fnStart)}\n`;
    case "checkListItem": {
      const checked = block.props?.checked ? "[x]" : "[ ]";
      return `- ${checked} ${serializeInlineContent(content, entries, formatter, history, fnStart)}\n`;
    }
    default:
      if (content.length > 0) {
        return serializeInlineContent(content, entries, formatter, history, fnStart) + "\n\n";
      }
      return "";
  }
}

function serializeInlineContent(
  content: any[],
  entries?: BibEntry[],
  formatter?: CitationFormatter,
  history?: CitationHistoryEntry[],
  fnStart?: number
): string {
  if (!content || !Array.isArray(content)) return "";

  let fnCounter = fnStart ?? 0;

  return content
    .map((item) => {
      if (item.type === "text") {
        return serializeStyledText(item);
      }
      if (item.type === "citation") {
        const key = item.props?.key ?? "";
        if (!key) return "";

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
            return `#footnote[${footnoteText}]`;
          }
        }

        // Fallback: Typst native cite syntax
        return `#cite(<${key}>)`;
      }
      if (item.type === "link") {
        const href = item.href ?? "";
        const text = item.content
          ? item.content.map((c: any) => c.text ?? "").join("")
          : href;
        return `#link("${href}")[${text}]`;
      }
      return item.text ?? "";
    })
    .join("");
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
