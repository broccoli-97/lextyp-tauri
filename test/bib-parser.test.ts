import { describe, it, expect } from "vitest";
import { parseBibtex } from "../src/lib/bib-parser";
import { bibContent, allEntries } from "./fixtures";

describe("parseBibtex", () => {
  it("parses all 8 entries from sample.bib", () => {
    expect(allEntries).toHaveLength(8);
  });

  it("extracts correct keys", () => {
    const keys = allEntries.map((e) => e.key);
    expect(keys).toEqual([
      "donoghue1932",
      "humanrights1998",
      "hart1961",
      "dworkin1986",
      "fuller1958",
      "raz1972",
      "finnis1980",
      "smith2020",
    ]);
  });

  it("extracts correct entry types", () => {
    const types = allEntries.map((e) => e.type);
    expect(types).toEqual([
      "case",
      "legislation",
      "book",
      "book",
      "article",
      "article",
      "incollection",
      "phdthesis",
    ]);
  });

  it("parses book fields correctly", () => {
    const hart = allEntries.find((e) => e.key === "hart1961")!;
    expect(hart.fields.author).toBe("H.L.A. Hart");
    expect(hart.fields.title).toBe("The Concept of Law");
    expect(hart.fields.publisher).toBe("Oxford University Press");
    expect(hart.fields.year).toBe("1961");
  });

  it("parses article fields correctly", () => {
    const fuller = allEntries.find((e) => e.key === "fuller1958")!;
    expect(fuller.fields.author).toBe("Lon L. Fuller");
    expect(fuller.fields.title).toBe(
      "Positivism and Fidelity to Law: A Reply to Professor Hart"
    );
    expect(fuller.fields.journal).toBe("Harvard Law Review");
    expect(fuller.fields.volume).toBe("71");
    expect(fuller.fields.pages).toBe("630--672");
  });

  it("parses case fields correctly", () => {
    const d = allEntries.find((e) => e.key === "donoghue1932")!;
    expect(d.fields.author).toBe("Donoghue v Stevenson");
    expect(d.fields.court).toBe("UKHL");
    expect(d.fields.number).toBe("100");
  });

  it("parses incollection fields correctly", () => {
    const f = allEntries.find((e) => e.key === "finnis1980")!;
    expect(f.fields.editor).toBe("P.M.S. Hacker and Joseph Raz");
    expect(f.fields.booktitle).toBe("Law, Morality, and Society");
    expect(f.fields.pages).toBe("115--137");
  });

  it("parses phdthesis fields correctly", () => {
    const s = allEntries.find((e) => e.key === "smith2020")!;
    expect(s.fields.school).toBe("University of Oxford");
  });

  it("returns empty array for empty input", () => {
    expect(parseBibtex("")).toEqual([]);
  });

  it("skips @string, @preamble, @comment entries", () => {
    const input = `
      @string{oup = {Oxford University Press}}
      @preamble{"Some preamble"}
      @comment{This is a comment}
      @book{test2000,
        author = {Test Author},
        title = {Test Title},
        year = {2000},
      }
    `;
    const entries = parseBibtex(input);
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("test2000");
  });

  it("handles quote-delimited field values", () => {
    const input = `@book{quoted2000,
      author = "Quoted Author",
      title = "Quoted Title",
      year = "2000",
    }`;
    const entries = parseBibtex(input);
    expect(entries).toHaveLength(1);
    expect(entries[0].fields.author).toBe("Quoted Author");
    expect(entries[0].fields.title).toBe("Quoted Title");
  });
});
