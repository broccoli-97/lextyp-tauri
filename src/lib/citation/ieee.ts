import type { CitationFormatter } from "./formatter";
import { italicize, field } from "./formatter";

export const ieeeFormatter: CitationFormatter = {
  styleName: "ieee",
  kind: "in-text",
  formatCitation(_entry, pinpoint, _history, index) {
    // IEEE in-text marker: [N] keyed to the bibliography index. Same number
    // is reused on every cite of the same source — the serializer hands us
    // the bibliography index, not a per-occurrence counter.
    return `[${index}${pinpoint ? `, ${pinpoint}` : ""}]`;
  },
  formatBibliography(entry, index) {
    if (!entry.key) return "[unknown reference]";
    let r = `[${index}] `;
    const author = field(entry, "author");
    const title = field(entry, "title");
    const year = field(entry, "year");
    if (author) r += `${author}, `;
    if (title) r += `"${title}," `;
    const journal = field(entry, "journal");
    const volume = field(entry, "volume");
    const number = field(entry, "number");
    const pages = field(entry, "pages");
    if (journal) {
      r += italicize(journal);
      if (volume) r += `, vol. ${volume}`;
      if (number) r += `, no. ${number}`;
      if (pages) r += `, pp. ${pages}`;
      if (year) r += `, ${year}`;
      r += ".";
    } else {
      const publisher = field(entry, "publisher");
      const address = field(entry, "address");
      if (address) r += `${address}: `;
      if (publisher) r += `${publisher}, `;
      if (year) r += `${year}.`;
    }
    return r;
  },
};
