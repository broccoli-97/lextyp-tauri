/**
 * Serialize BlockNote document to Typst source.
 * Walks the block tree and produces Typst markup.
 */
export function serializeToTypst(blocks: any[]): string {
  let output = "";

  // Preamble
  output += '#set page(paper: "a4", margin: 2cm)\n';
  output += "#set text(size: 11pt)\n";
  output += "#set par(justify: true, leading: 0.65em)\n\n";

  for (const block of blocks) {
    output += serializeBlock(block);
  }

  return output;
}

function serializeBlock(block: any): string {
  const content = Array.isArray(block.content) ? block.content : [];

  switch (block.type) {
    case "heading": {
      const level = block.props?.level ?? 1;
      const prefix = "=".repeat(level);
      const text = serializeInlineContent(content);
      return `${prefix} ${text}\n`;
    }
    case "paragraph": {
      const text = serializeInlineContent(content);
      if (!text.trim()) return "\n";
      return text + "\n\n";
    }
    case "bulletListItem":
      return `- ${serializeInlineContent(content)}\n`;
    case "numberedListItem":
      return `+ ${serializeInlineContent(content)}\n`;
    case "checkListItem": {
      const checked = block.props?.checked ? "[x]" : "[ ]";
      return `- ${checked} ${serializeInlineContent(content)}\n`;
    }
    default:
      if (content.length > 0) {
        return serializeInlineContent(content) + "\n\n";
      }
      return "";
  }
}

function serializeInlineContent(content: any[]): string {
  if (!content || !Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (item.type === "text") {
        return serializeStyledText(item);
      }
      if (item.type === "citation") {
        const key = item.props?.key ?? "";
        return `@${key}`;
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

function serializeStyledText(item: any): string {
  let text: string = item.text ?? "";
  if (!text) return "";

  const styles = item.styles ?? {};

  if (styles.bold) text = `*${text}*`;
  if (styles.italic) text = `_${text}_`;
  if (styles.code) text = `\`${text}\``;
  if (styles.strikethrough) text = `#strike[${text}]`;
  if (styles.underline) text = `#underline[${text}]`;

  return text;
}
