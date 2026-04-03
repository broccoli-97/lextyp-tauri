import type { CitationFormatter } from "./formatter";
import { italicize, field } from "./formatter";

export const plainFormatter: CitationFormatter = {
  styleName: "plain",
  formatFootnote(entry, pinpoint, _history, fn) {
    if (!entry.key) return "[unknown reference]";
    let r = `[${fn}] `;
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
    if (pinpoint) r += ` ${pinpoint}`;
    return r;
  },
};
