import type { CitationFormatter } from "./formatter";
import { shortAuthor, italicize, field } from "./formatter";

export const chicagoFormatter: CitationFormatter = {
  styleName: "chicago",
  kind: "footnote",
  formatCitation(entry, pinpoint, history, _fn) {
    if (!entry.key) return "[unknown reference]";
    // Ibid
    if (history.length > 0 && history[history.length - 1].key === entry.key)
      return pinpoint ? `Ibid., ${pinpoint}` : "Ibid.";
    // Short form
    for (const prev of history) {
      if (prev.key === entry.key) {
        const a = shortAuthor(field(entry, "author"));
        let t = field(entry, "title");
        const words = t.split(" ");
        if (words.length > 4) t = words.slice(0, 4).join(" ") + "...";
        let r = `${a}, ${italicize(t)}`;
        if (pinpoint) r += `, ${pinpoint}`;
        return r;
      }
    }
    // Full form
    const author = field(entry, "author");
    const title = field(entry, "title");
    const year = field(entry, "year");
    let r = author ? `${author}, ` : "";
    if (title) r += (entry.type === "article" ? `"${title}," ` : italicize(title));
    const journal = field(entry, "journal");
    const volume = field(entry, "volume");
    const number = field(entry, "number");
    const pages = field(entry, "pages");
    if (journal) {
      r += ` ${italicize(journal)}`;
      if (volume) { r += ` ${volume}`; if (number) r += `, no. ${number}`; }
      if (year) r += ` (${year})`;
      if (pages) r += `: ${pages}`;
    } else {
      const address = field(entry, "address");
      const publisher = field(entry, "publisher");
      if (address || publisher || year) {
        r += " (";
        if (address) r += `${address}: `;
        if (publisher) r += publisher;
        if (year) { if (publisher) r += ", "; r += year; }
        r += ")";
      }
    }
    if (pinpoint) r += `, ${pinpoint}`;
    return r;
  },
  formatBibliography(entry, _index) {
    // Empty history forces the full first-cite form (no Ibid/short-form).
    return this.formatCitation(entry, "", [], 0);
  },
};
