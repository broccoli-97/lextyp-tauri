import type { CitationFormatter } from "./formatter";
import { italicize, field } from "./formatter";

export const apaFormatter: CitationFormatter = {
  styleName: "apa",
  formatFootnote(entry, pinpoint, _history, _fn) {
    if (!entry.key) return "[unknown reference]";
    const author = field(entry, "author");
    const year = field(entry, "year");
    const title = field(entry, "title");
    let r = "";
    if (author) r += author;
    if (year) r += ` (${year})`;
    if (r) r += ". ";
    if (title) r += (entry.type === "article" ? `${title}. ` : `${italicize(title)}. `);
    const journal = field(entry, "journal");
    const volume = field(entry, "volume");
    const number = field(entry, "number");
    const pages = field(entry, "pages");
    if (journal) {
      r += italicize(journal);
      if (volume) { r += `, ${italicize(volume)}`; if (number) r += `(${number})`; }
      if (pages) r += `, ${pages}`;
      r += ".";
    }
    const publisher = field(entry, "publisher");
    if (!journal && publisher) r += `${publisher}.`;
    if (pinpoint) r += ` ${pinpoint}`;
    return r;
  },
};
