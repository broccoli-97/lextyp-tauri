import type { CitationFormatter } from "./formatter";
import { italicize, field } from "./formatter";

export const harvardFormatter: CitationFormatter = {
  styleName: "harvard",
  formatFootnote(entry, pinpoint, _history, _fn) {
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
    if (pinpoint) r += ` ${pinpoint}`;
    return r;
  },
};
