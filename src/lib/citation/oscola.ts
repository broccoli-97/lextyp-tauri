import type { BibEntry } from "../../types/bib";
import { type CitationFormatter, shortAuthor, italicize, field } from "./formatter";

export const oscolaFormatter: CitationFormatter = {
  styleName: "oscola",
  kind: "footnote",
  formatCitation(entry, pinpoint, history, _fn) {
    if (!entry.key) return "[unknown reference]";
    // Ibid
    if (history.length > 0 && history[history.length - 1].key === entry.key)
      return pinpoint ? `ibid, ${pinpoint}` : "ibid";
    // Short form
    for (const prev of history) {
      if (prev.key === entry.key) {
        if (entry.type === "case") return caseShort(entry, pinpoint, prev.footnoteNumber);
        if (entry.type === "book") return bookShort(entry, pinpoint, prev.footnoteNumber);
        if (entry.type === "legislation") return legislationFull(entry, pinpoint);
        return genericShort(entry, pinpoint, prev.footnoteNumber);
      }
    }
    // Full form
    if (entry.type === "case") return caseFull(entry, pinpoint);
    if (entry.type === "legislation") return legislationFull(entry, pinpoint);
    if (entry.type === "book") return bookFull(entry, pinpoint);
    if (entry.type === "article") return articleFull(entry, pinpoint);
    if (entry.type === "inproceedings" || entry.type === "conference") return inProceedingsFull(entry, pinpoint);
    if (entry.type === "incollection" || entry.type === "inbook") return inCollectionFull(entry, pinpoint);
    if (entry.type === "phdthesis" || entry.type === "mastersthesis") return thesisFull(entry, pinpoint);
    // Fallback
    let t = field(entry, "author");
    if (t) t += ", ";
    t += italicize(field(entry, "title"));
    if (pinpoint) t += ` ${pinpoint}`;
    return t;
  },
  formatBibliography(entry, _index) {
    // OSCOLA bibliography mirrors the first-cite full form, no pinpoint, no
    // ibid/short-form (empty history forces the full branch).
    return this.formatCitation(entry, "", [], 0);
  },
};

function caseFull(e: BibEntry, pp: string): string {
  let parties = field(e, "author") || field(e, "title");
  let r = italicize(parties);
  const year = field(e, "year");
  if (year) r += ` [${year}]`;
  const court = field(e, "court");
  if (court) r += ` ${court}`;
  const num = field(e, "number");
  if (num) r += ` ${num}`;
  if (pp) r += `, ${pp}`;
  return r;
}

function caseShort(e: BibEntry, pp: string, fn: number): string {
  let parties = field(e, "author") || field(e, "title");
  const vPos = parties.indexOf(" v ");
  if (vPos > 0) parties = parties.substring(0, vPos);
  let r = `${italicize(parties)} (n ${fn})`;
  if (pp) r += `, ${pp}`;
  return r;
}

function legislationFull(e: BibEntry, pp: string): string {
  let r = field(e, "title");
  const year = field(e, "year");
  if (year) r += ` ${year}`;
  if (pp) r += `, ${pp}`;
  return r;
}

function bookFull(e: BibEntry, pp: string): string {
  const author = field(e, "author");
  const title = field(e, "title");
  const publisher = field(e, "publisher");
  const year = field(e, "year");
  let r = author ? `${author}, ` : "";
  r += italicize(title);
  if (publisher || year) {
    r += " (";
    if (publisher) r += publisher;
    if (publisher && year) r += " ";
    if (year) r += year;
    r += ")";
  }
  if (pp) r += ` ${pp}`;
  return r;
}

function bookShort(e: BibEntry, pp: string, fn: number): string {
  let r = `${shortAuthor(field(e, "author"))} (n ${fn})`;
  if (pp) r += ` ${pp}`;
  return r;
}

function articleFull(e: BibEntry, pp: string): string {
  const author = field(e, "author");
  const title = field(e, "title");
  const journal = field(e, "journal");
  const volume = field(e, "volume");
  const pages = field(e, "pages");
  const year = field(e, "year");
  let r = author ? `${author}, ` : "";
  if (title) r += `'${title}'`;
  if (year) r += ` (${year})`;
  if (volume) r += ` ${volume}`;
  if (journal) r += ` ${italicize(journal)}`;
  if (pages) r += ` ${pages}`;
  if (pp) r += `, ${pp}`;
  return r;
}

function inProceedingsFull(e: BibEntry, pp: string): string {
  const author = field(e, "author");
  const title = field(e, "title");
  const booktitle = field(e, "booktitle");
  const publisher = field(e, "publisher");
  const year = field(e, "year");
  const pages = field(e, "pages");
  let r = author ? `${author}, ` : "";
  if (title) r += `'${title}'`;
  if (booktitle) r += ` in ${italicize(booktitle)}`;
  if (publisher || year) {
    r += " (";
    if (publisher) r += publisher;
    if (publisher && year) r += " ";
    if (year) r += year;
    r += ")";
  }
  if (pages) r += ` ${pages}`;
  if (pp) r += `, ${pp}`;
  return r;
}

function inCollectionFull(e: BibEntry, pp: string): string {
  const author = field(e, "author");
  const title = field(e, "title");
  const editor = field(e, "editor");
  const booktitle = field(e, "booktitle");
  const publisher = field(e, "publisher");
  const year = field(e, "year");
  const pages = field(e, "pages");
  let r = author ? `${author}, ` : "";
  if (title) r += `'${title}'`;
  if (editor) r += ` in ${editor} (ed), `;
  else if (booktitle) r += " in ";
  if (booktitle) r += italicize(booktitle);
  if (publisher || year) {
    r += " (";
    if (publisher) r += publisher;
    if (publisher && year) r += " ";
    if (year) r += year;
    r += ")";
  }
  if (pages) r += ` ${pages}`;
  if (pp) r += `, ${pp}`;
  return r;
}

function thesisFull(e: BibEntry, pp: string): string {
  const author = field(e, "author");
  const title = field(e, "title");
  const school = field(e, "school");
  const year = field(e, "year");
  const thesisType = e.type === "phdthesis" ? "PhD thesis" : "MA thesis";
  let r = author ? `${author}, ` : "";
  if (title) r += `'${title}'`;
  r += ` (${thesisType}`;
  if (school) r += `, ${school}`;
  if (year) r += ` ${year}`;
  r += ")";
  if (pp) r += ` ${pp}`;
  return r;
}

function genericShort(e: BibEntry, pp: string, fn: number): string {
  let r = `${shortAuthor(field(e, "author"))} (n ${fn})`;
  if (pp) r += ` ${pp}`;
  return r;
}
