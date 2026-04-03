import type { BibEntry } from "../types/bib";

/**
 * Simple BibTeX parser. Parses .bib file content into BibEntry[].
 * Handles brace-delimited and quote-delimited values with nesting.
 */
export function parseBibtex(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const entryRe = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let match: RegExpExecArray | null;

  while ((match = entryRe.exec(content)) !== null) {
    const type = match[1].toLowerCase();
    if (type === "string" || type === "preamble" || type === "comment") continue;
    const key = match[2];

    // Find matching closing brace
    let depth = 1;
    let i = content.indexOf("{", match.index) + 1;
    // Skip past key and comma
    i = match.index + match[0].length;
    const start = i;
    let end = i;
    for (; end < content.length && depth > 0; end++) {
      if (content[end] === "{") depth++;
      else if (content[end] === "}") depth--;
    }

    const fieldBlock = content.substring(start, end - 1).trim();
    const fields = parseFields(fieldBlock);

    entries.push({ key, type, fields });
    entryRe.lastIndex = end;
  }

  return entries;
}

function parseFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldRe = /(\w+)\s*=\s*/g;
  let fm: RegExpExecArray | null;

  while ((fm = fieldRe.exec(block)) !== null) {
    const name = fm[1].toLowerCase();
    let pos = fm.index + fm[0].length;
    let value = "";

    if (pos < block.length && block[pos] === "{") {
      // Brace-delimited
      let depth = 1;
      let vEnd = pos + 1;
      for (; vEnd < block.length && depth > 0; vEnd++) {
        if (block[vEnd] === "{") depth++;
        else if (block[vEnd] === "}") depth--;
      }
      value = block.substring(pos + 1, vEnd - 1);
      fieldRe.lastIndex = vEnd;
    } else if (pos < block.length && block[pos] === '"') {
      // Quote-delimited
      const qEnd = block.indexOf('"', pos + 1);
      value = qEnd >= 0 ? block.substring(pos + 1, qEnd) : "";
      fieldRe.lastIndex = (qEnd >= 0 ? qEnd : pos) + 1;
    } else {
      // Bare value
      const bareRe = /[\w\d.+-]+/;
      const bareMatch = bareRe.exec(block.substring(pos));
      if (bareMatch) {
        value = bareMatch[0];
        fieldRe.lastIndex = pos + bareMatch[0].length;
      }
    }

    fields[name] = stripBraces(value);
  }

  return fields;
}

function stripBraces(value: string): string {
  return value.replace(/[{}]/g, "").trim();
}
