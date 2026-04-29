import type { BibEntry, CitationHistoryEntry } from "../types/bib";
import type { CitationFormatter } from "./citation/formatter";

/**
 * Resolver that loads an included document's blocks and bibliography so the
 * serializer can inline them. Provided by the app at compile/save time.
 */
export type IncludeResolver = (path: string) => Promise<{
  blocks: any[];
  entries: BibEntry[];
  citationStyle: string;
}>;

interface SerializeContext {
  entries: BibEntry[];
  formatter?: CitationFormatter;
  history: CitationHistoryEntry[];
  footnoteCounter: { value: number };
  trackBlocks: boolean;
  resolveInclude?: IncludeResolver;
  visited: Set<string>;
  /**
   * Insertion-ordered list of citation keys that actually appear in the body.
   * Drives the auto-generated References section at the end of the document.
   */
  citedKeys: string[];
}

/**
 * Serialize BlockNote document to Typst source.
 * Citation @keys are expanded to #footnote[...] using the active formatter.
 * When `trackBlocks` is true, each block is wrapped with a metadata tracker
 * so that `typst query` can return page positions for each block.
 * When `resolveInclude` is provided, `documentInclude` blocks are inlined
 * recursively (with cycle detection).
 */
export async function serializeToTypst(
  blocks: any[],
  entries?: BibEntry[],
  formatter?: CitationFormatter,
  trackBlocks = false,
  resolveInclude?: IncludeResolver,
  bibliographyHeading = "References"
): Promise<string> {
  const ctx: SerializeContext = {
    entries: entries ? [...entries] : [],
    formatter,
    history: [],
    footnoteCounter: { value: 0 },
    trackBlocks,
    resolveInclude,
    visited: new Set<string>(),
    citedKeys: [],
  };

  const preamble = buildPreamble(trackBlocks);
  const body = await serializeBody(blocks, ctx, trackBlocks);
  const bibliography = buildBibliography(ctx, bibliographyHeading);
  return preamble + body + bibliography;
}

function buildPreamble(trackBlocks: boolean): string {
  let output = "";

  // Preamble — academic / law-paper conventions (OSCOLA, Bluebook, APA Level-1,
  // UK & US law-school house styles):
  //   • 12pt Times-family body, justified, 1.5 line spacing
  //     (strict Bluebook/OSCOLA submissions use double — change leading to 1.65em)
  //   • 2.54cm (1") margins all sides
  //   • H1 centered + bold 17pt; H2 14pt bold; H3 12pt bold; H4 12pt bold italic
  //   • 10pt single-spaced footnotes
  output += '#set page(paper: "a4", margin: 2.54cm, numbering: "1")\n';
  // Font fallback chain: Times New Roman → Times → Libertinus Serif (Typst's
  // bundled default, visually Times-like and available on every platform).
  output += '#set text(size: 12pt, font: ("Times New Roman", "Times", "Libertinus Serif"))\n';
  output += "#set par(justify: true, leading: 1em)\n"; // ≈ 1.5 line spacing
  output += '#show link: it => underline(text(fill: rgb("#2563eb"), it))\n';
  // Balanced heading hierarchy — size falls off gradually and every level
  // reads as distinctly heading-weight (H4 is bold-italic, not plain italic,
  // so it doesn't blend into body text).
  output += "#show heading.where(level: 1): it => align(center, it)\n";
  output += '#show heading.where(level: 1): set text(size: 17pt, weight: "bold")\n';
  output += '#show heading.where(level: 2): set text(size: 14pt, weight: "bold")\n';
  output += '#show heading.where(level: 3): set text(size: 12pt, weight: "bold")\n';
  output += '#show heading.where(level: 4): set text(size: 12pt, weight: "bold", style: "italic")\n';
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
  return output;
}

/**
 * Emit an auto-generated References section listing every entry that the body
 * actually cited, in first-cite order. The section starts on a fresh page
 * (`weak: true` collapses against existing page boundaries). Returns "" if
 * nothing was cited or the formatter cannot render bibliography entries.
 */
function buildBibliography(ctx: SerializeContext, heading: string): string {
  if (ctx.citedKeys.length === 0) return "";
  if (!ctx.formatter || typeof ctx.formatter.formatBibliography !== "function") return "";

  const lines: string[] = [];
  let index = 1;
  for (const key of ctx.citedKeys) {
    const entry = ctx.entries.find((e) => e.key === key);
    if (!entry) continue;
    const text = ctx.formatter.formatBibliography(entry, index);
    if (!text.trim()) continue;
    lines.push(text);
    index++;
  }
  if (lines.length === 0) return "";

  let output = "\n#pagebreak(weak: true)\n";
  output += `= ${escapeTypst(heading)}\n\n`;
  for (const line of lines) {
    output += `${line}\n\n`;
  }
  return output;
}

async function serializeBody(
  blocks: any[],
  ctx: SerializeContext,
  trackOwnBlocks: boolean
): Promise<string> {
  let output = "";

  for (const block of blocks) {
    if (block?.type === "documentInclude") {
      output += await serializeInclude(block, ctx);
      continue;
    }

    if (block?.type === "tableOfContents") {
      // Wrap in weak pagebreaks so the TOC sits on its own page. `weak: true`
      // collapses against existing page boundaries, so it doesn't add a blank
      // page when the TOC happens to already be at the top of one.
      output += "#pagebreak(weak: true)\n#outline()\n#pagebreak(weak: true)\n\n";
      continue;
    }

    const trackId = trackOwnBlocks && block.id ? block.id : undefined;
    const blockContent = serializeBlock(block, ctx, trackId);

    if (trackId && blockContent.trim()) {
      const trimmed = blockContent.replace(/\n+$/, "");
      const trailing = blockContent.slice(trimmed.length);
      output += `#__track("${trackId}")[${trimmed}]${trailing}`;
    } else {
      output += blockContent;
    }
  }

  return output;
}

async function serializeInclude(
  block: any,
  ctx: SerializeContext
): Promise<string> {
  const path: string = block?.props?.path ?? "";
  if (!path) return "";
  if (!ctx.resolveInclude) return "";

  if (ctx.visited.has(path)) {
    return `// skipped cyclic include: ${path}\n`;
  }

  ctx.visited.add(path);
  let child: { blocks: any[]; entries: BibEntry[]; citationStyle: string };
  try {
    child = await ctx.resolveInclude(path);
  } catch (err) {
    ctx.visited.delete(path);
    return `// failed to load include ${path}: ${String(err)}\n`;
  }

  // Merge child bib entries into ctx.entries — root wins on key collision.
  for (const entry of child.entries) {
    if (!ctx.entries.some((e) => e.key === entry.key)) {
      ctx.entries.push(entry);
    }
  }

  // Recursively serialize child body. No preamble, no own-block tracking.
  // Wrap with weak pagebreaks so the include starts on a fresh page and any
  // content following it also starts on a fresh page. `weak: true` avoids
  // blank pages when adjacent to page boundaries.
  const childBody = await serializeBody(child.blocks, ctx, false);
  ctx.visited.delete(path);
  return `#pagebreak(weak: true)\n${childBody}#pagebreak(weak: true)\n`;
}

function serializeBlock(
  block: any,
  ctx: SerializeContext,
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
      const text = serializeInlineContent(content, ctx, trackBlockId);
      return `${prefix} ${wrapBlockColors(text)}\n`;
    }
    case "paragraph": {
      const text = serializeInlineContent(content, ctx, trackBlockId);
      if (!text.trim()) return "\n";
      return wrapBlockColors(text) + "\n\n";
    }
    case "bulletListItem":
      return `- ${wrapBlockColors(serializeInlineContent(content, ctx, trackBlockId))}\n`;
    case "numberedListItem":
      return `+ ${wrapBlockColors(serializeInlineContent(content, ctx, trackBlockId))}\n`;
    case "checkListItem": {
      const checked = block.props?.checked ? "[x]" : "[ ]";
      return `- ${checked} ${wrapBlockColors(serializeInlineContent(content, ctx, trackBlockId))}\n`;
    }
    default:
      if (content.length > 0) {
        return wrapBlockColors(serializeInlineContent(content, ctx, trackBlockId)) + "\n\n";
      }
      return "";
  }
}

function serializeInlineContent(
  content: any[],
  ctx: SerializeContext,
  trackBlockId?: string
): string {
  if (!content || !Array.isArray(content)) return "";

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

      if (ctx.formatter && ctx.entries.length > 0) {
        const entry = ctx.entries.find((e) => e.key === key);
        if (entry) {
          if (!ctx.citedKeys.includes(key)) ctx.citedKeys.push(key);

          if (ctx.formatter.kind === "footnote") {
            // Footnote styles (OSCOLA, Chicago): each occurrence gets its own
            // footnote number; the formatter consults `history` for ibid /
            // short-form behavior.
            ctx.footnoteCounter.value++;
            const text = ctx.formatter.formatCitation(
              entry, "", ctx.history, ctx.footnoteCounter.value
            );
            ctx.history.push({ key, footnoteNumber: ctx.footnoteCounter.value });
            out += `#footnote[${text}]`;
          } else {
            // In-text styles (APA/Harvard author-date, IEEE/plain numeric):
            // splice the marker directly into the running text. The numeric
            // styles want the bibliography index — same number on every reuse.
            const bibIndex = ctx.citedKeys.indexOf(key) + 1;
            out += ctx.formatter.formatCitation(entry, "", ctx.history, bibIndex);
          }
          continue;
        }
      }

      // Fallback: Typst native cite syntax (no formatter or unknown key).
      if (!ctx.citedKeys.includes(key)) ctx.citedKeys.push(key);
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
