import type { CitationFormatter } from "./formatter";
import { italicize, field, shortAuthor } from "./formatter";

export const apaFormatter: CitationFormatter = {
  styleName: "apa",
  kind: "in-text",
  formatCitation(entry, pinpoint, _history, _index) {
    if (!entry.key) return "[unknown reference]";
    // APA in-text: (Author, Year) parenthetical. Fall back to title when the
    // entry has no author (legislation, anonymous works).
    const author = field(entry, "author");
    const year = field(entry, "year");
    const marker = author ? shortAuthor(author) : (field(entry, "title") || entry.key);
    let r = `(${marker}`;
    if (year) r += `, ${year}`;
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
    return r;
  },
};
