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

  // Preamble — academic / law-paper conventions (OSCOLA, Bluebook, APA Level-1,
  // UK & US law-school house styles):
  //   • 12pt Times-family body, justified, 1.5 line spacing
  //     (strict Bluebook/OSCOLA submissions use double — change leading to 1.65em)
  //   • 2.54cm (1") margins all sides
  //   • H1 centered + bold (APA/Chicago Level-1); sub-headings flush-left
  //   • 10pt single-spaced footnotes
  output += '#set page(paper: "a4", margin: 2.54cm)\n';
  // Font fallback chain: Times New Roman → Times → Libertinus Serif (Typst's
  // bundled default, visually Times-like and available on every platform).
  output += '#set text(size: 12pt, font: ("Times New Roman", "Times", "Libertinus Serif"))\n';
  output += "#set par(justify: true, leading: 1em)\n"; // ≈ 1.5 line spacing
  output += '#show link: it => underline(text(fill: rgb("#2563eb"), it))\n';
  // Heading hierarchy — emphasis by weight/italic + alignment, not size.
  output += "#show heading.where(level: 1): it => align(center, it)\n";
  output += '#show heading.where(level: 1): set text(size: 17pt, weight: "bold")\n';
  output += '#show heading.where(level: 2): set text(size: 12pt, weight: "bold")\n';
  output += '#show heading.where(level: 3): set text(size: 12pt, weight: "bold", style: "italic")\n';
  output += '#show heading.where(level: 4): set text(size: 12pt, style: "italic")\n';
  // Generous spacing around headings — academic papers breathe. H1 gets the
  // most room above (it's typically a title / major section break).
  output += "#show heading.where(level: 1): set block(above: 2.4em, below: 1.4em)\n";
  output += "#show heading.where(level: 2): set block(above: 1.6em, below: 0.9em)\n";
  output += "#show heading.where(level: 3): set block(above: 1.3em, below: 0.7em)\n";
  output += "#show heading.where(level: 4): set block(above: 1.1em, below: 0.6em)\n";
  // 10pt single-spaced footnotes.
  output += "#show footnote.entry: set text(size: 10pt)\n";
  output += "#show footnote.entry: set par(leading: 0.55em)\n";

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

  // Block-level colors (applied via toolbar with no selection) are stored on
  // block props, not on inline text. Wrap the serialized inline content in
  // `#text` / `#highlight` so the color still shows in the PDF.
  const wrapBlockColors = (inner: string): string => {
    const tc = resolveColor(block.props?.textColor, TEXT_COLOR_HEX);
    const bg = resolveColor(block.props?.backgroundColor, BG_COLOR_HEX);
    if (tc) inner = `#text(fill: rgb("${tc}"))[${inner}]`;
    if (bg) inner = `#highlight(fill: rgb("${bg}"))[${inner}]`;
    return inner;
  };

  switch (block.type) {
    case "heading": {
      const level = block.props?.level ?? 1;
      const prefix = "=".repeat(level);
      const text = serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId);
      return `${prefix} ${wrapBlockColors(text)}\n`;
    }
    case "paragraph": {
      const text = serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId);
      if (!text.trim()) return "\n";
      return wrapBlockColors(text) + "\n\n";
    }
    case "bulletListItem":
      return `- ${wrapBlockColors(serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId))}\n`;
    case "numberedListItem":
      return `+ ${wrapBlockColors(serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId))}\n`;
    case "checkListItem": {
      const checked = block.props?.checked ? "[x]" : "[ ]";
      return `- ${checked} ${wrapBlockColors(serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId))}\n`;
    }
    default:
      if (content.length > 0) {
        return wrapBlockColors(serializeInlineContent(content, entries, formatter, history, fnStart, trackBlockId)) + "\n\n";
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
      const linkItems: any[] = Array.isArray(item.content) ? item.content : [];
      const linkText = linkItems.map((c: any) => c.text ?? "").join("");
      if (trackBlockId && linkText) {
        out += `#__w("${trackBlockId}",${charOffset});`;
      }
      // Preserve inline styles (bold/italic/strike/…) inside the link body.
      const inner = linkItems
        .map((li: any) => {
          const t: string = li.text ?? "";
          if (!t) return "";
          return applyTextStyles(escapeTypst(t), li.styles ?? {});
        })
        .join("");
      out += `#link("${escapeTypstString(href)}")[${inner}]`;
      charOffset += linkText.length;
      continue;
    }

    out += item.text ?? "";
  }

  return out;
}

// BlockNote's named color palette, mirrored from its own Block.css so the
// PDF matches what the user sees in the editor. Values in the document are
// color names (e.g. "red"); a raw hex string is also accepted as a fallback.
const TEXT_COLOR_HEX: Record<string, string> = {
  gray: "#9b9a97",
  brown: "#64473a",
  red: "#e03e3e",
  orange: "#d9730d",
  yellow: "#dfab01",
  green: "#4d6461",
  blue: "#0b6e99",
  purple: "#6940a5",
  pink: "#ad1a72",
};
const BG_COLOR_HEX: Record<string, string> = {
  gray: "#ebeced",
  brown: "#e9e5e3",
  red: "#fbe4e4",
  orange: "#f6e9d9",
  yellow: "#fbf3db",
  green: "#ddedea",
  blue: "#ddebf1",
  purple: "#eae4f2",
  pink: "#f4dfeb",
};

function resolveColor(
  value: unknown,
  map: Record<string, string>
): string | null {
  if (typeof value !== "string" || !value || value === "default") return null;
  if (map[value]) return map[value];
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
  return null;
}

function applyTextStyles(text: string, styles: any): string {
  if (styles.bold) text = `*${text}*`;
  if (styles.italic) text = `_${text}_`;
  if (styles.code) text = `\`${text}\``;
  // BlockNote's default style name is `strike` (not `strikethrough`).
  if (styles.strike) text = `#strike[${text}]`;
  if (styles.underline) text = `#underline[${text}]`;
  const tc = resolveColor(styles.textColor, TEXT_COLOR_HEX);
  if (tc) text = `#text(fill: rgb("${tc}"))[${text}]`;
  const bg = resolveColor(styles.backgroundColor, BG_COLOR_HEX);
  if (bg) text = `#highlight(fill: rgb("${bg}"))[${text}]`;
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

/**
 * Escape a JS string for embedding inside a Typst string literal.
 * Only `\` and `"` need escaping inside `"..."`.
 */
function escapeTypstString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function serializeStyledText(item: any): string {
  const text: string = item.text ?? "";
  if (!text) return "";
  return applyTextStyles(escapeTypst(text), item.styles ?? {});
}
