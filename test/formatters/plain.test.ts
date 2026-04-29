import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/lib/citation/registry";
import { hart, fuller, donoghue, humanrights, smith } from "../fixtures";

const fmt = getFormatter("plain");

describe("Plain formatter", () => {
  it("declares in-text kind", () => {
    expect(fmt.kind).toBe("in-text");
  });

  describe("in-text citation (formatCitation)", () => {
    it("produces [N] using the bibliography index", () => {
      expect(fmt.formatCitation(hart, "", [], 1)).toBe("[1]");
      expect(fmt.formatCitation(fuller, "", [], 5)).toBe("[5]");
    });

    it("appends pinpoint inside the brackets", () => {
      expect(fmt.formatCitation(hart, "p. 42", [], 3)).toBe("[3, p. 42]");
    });
  });

  describe("bibliography entry (formatBibliography)", () => {
    it("formats a book", () => {
      expect(fmt.formatBibliography(hart, 1)).toBe(
        "[1] H.L.A. Hart. _The Concept of Law_. 1961."
      );
    });

    it("formats an article", () => {
      expect(fmt.formatBibliography(fuller, 2)).toBe(
        "[2] Lon L. Fuller. _Positivism and Fidelity to Law: A Reply to Professor Hart_. Harvard Law Review, 71:630--672, 1958."
      );
    });

    it("formats a case", () => {
      expect(fmt.formatBibliography(donoghue, 1)).toBe(
        "[1] Donoghue v Stevenson. _Donoghue v Stevenson_. 1932."
      );
    });

    it("formats legislation", () => {
      expect(fmt.formatBibliography(humanrights, 1)).toBe(
        "[1] _Human Rights Act_. 1998."
      );
    });

    it("formats a thesis", () => {
      expect(fmt.formatBibliography(smith, 1)).toBe(
        "[1] Jane Smith. _The Evolution of Legal Positivism in the 21st Century_. 2020."
      );
    });
  });

  describe("edge cases", () => {
    it("returns [unknown reference] for empty key in formatBibliography", () => {
      expect(
        fmt.formatBibliography({ key: "", type: "book", fields: {} }, 1)
      ).toBe("[unknown reference]");
    });
  });
});
