import type { CitationFormatter } from "./formatter";
import { italicize, field, shortAuthor } from "./formatter";

export const harvardFormatter: CitationFormatter = {
  styleName: "harvard",
  kind: "in-text",
  formatCitation(entry, pinpoint, _history, _index) {
    if (!entry.key) return "[unknown reference]";
    // Harvard in-text: (Author Year) — no comma between author and year, the
    // most common convention. Pinpoint is appended after a comma.
    const author = field(entry, "author");
    const year = field(entry, "year");
    const marker = author ? shortAuthor(author) : (field(entry, "title") || entry.key);
    let r = `(${marker}`;
    if (year) r += ` ${year}`;
    if (pinpoint) r += `, ${pinpoint}`;
    r += ")";
    return r;
  },
  formatBibliography(entry, _index) {
    if (!entry.key) return "[unknown reference]";
    const author = field(entry, "author");
    const year = field(entry, "year");
    const title = field(entry, "title");
    let r = "";
    if (author) r += author;
    if (year) r += ` (${year})`;
    if (r) r += " ";
    if (title) r += (entry.type === "article" ? `'${title}', ` : `${italicize(title)}. `);
    const journal = field(entry, "journal");
    const volume = field(entry, "volume");
    const pages = field(entry, "pages");
    if (journal) {
      r += italicize(journal);
      if (volume) r += `, vol. ${volume}`;
      if (pages) r += `, pp. ${pages}`;
      r += ".";
    }
    const address = field(entry, "address");
    const publisher = field(entry, "publisher");
    if (!journal) {
      if (address) r += `${address}: `;
      if (publisher) r += `${publisher}.`;
    }
    return r;
  },
};
