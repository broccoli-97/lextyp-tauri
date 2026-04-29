import type { CitationFormatter } from "./formatter";
import { italicize, field } from "./formatter";

export const plainFormatter: CitationFormatter = {
  styleName: "plain",
  kind: "in-text",
  formatCitation(_entry, pinpoint, _history, index) {
    // BibTeX `plain` style — numeric in-text marker [N] keyed to bibliography
    // index, just like IEEE.
    return `[${index}${pinpoint ? `, ${pinpoint}` : ""}]`;
  },
  formatBibliography(entry, index) {
    if (!entry.key) return "[unknown reference]";
    let r = `[${index}] `;
    const author = field(entry, "author");
    const title = field(entry, "title");
    const year = field(entry, "year");
    if (author) r += `${author}. `;
    if (title) r += `${italicize(title)}. `;
    const journal = field(entry, "journal");
    const volume = field(entry, "volume");
    const pages = field(entry, "pages");
    if (journal) {
      r += journal;
      if (volume) r += `, ${volume}`;
      if (pages) r += `:${pages}`;
      r += ", ";
    }
    if (year) r += `${year}.`;
    return r;
  },
};
