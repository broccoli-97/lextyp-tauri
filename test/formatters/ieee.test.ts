import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/lib/citation/registry";
import { hart, fuller, donoghue, humanrights, smith } from "../fixtures";

const fmt = getFormatter("ieee");

describe("IEEE formatter", () => {
  it("declares in-text kind", () => {
    expect(fmt.kind).toBe("in-text");
  });

  describe("in-text citation (formatCitation)", () => {
    it("produces [N] using the bibliography index", () => {
      expect(fmt.formatCitation(hart, "", [], 1)).toBe("[1]");
      expect(fmt.formatCitation(fuller, "", [], 7)).toBe("[7]");
    });

    it("appends pinpoint inside the brackets", () => {
      expect(fmt.formatCitation(hart, "p. 42", [], 3)).toBe("[3, p. 42]");
    });

    it("does not depend on entry contents", () => {
      // The marker is purely the index — same number on every reuse.
      expect(fmt.formatCitation(hart, "", [], 5)).toBe("[5]");
      expect(fmt.formatCitation(donoghue, "", [], 5)).toBe("[5]");
    });
  });

  describe("bibliography entry (formatBibliography)", () => {
    it("formats a book", () => {
      expect(fmt.formatBibliography(hart, 1)).toBe(
        '[1] H.L.A. Hart, "The Concept of Law," Oxford University Press, 1961.'
      );
    });

    it("formats an article", () => {
      expect(fmt.formatBibliography(fuller, 2)).toBe(
        '[2] Lon L. Fuller, "Positivism and Fidelity to Law: A Reply to Professor Hart," _Harvard Law Review_, vol. 71, pp. 630--672, 1958.'
      );
    });

    it("formats a case", () => {
      expect(fmt.formatBibliography(donoghue, 1)).toBe(
        '[1] Donoghue v Stevenson, "Donoghue v Stevenson," 1932.'
      );
    });

    it("formats legislation", () => {
      expect(fmt.formatBibliography(humanrights, 1)).toBe(
        '[1] "Human Rights Act," 1998.'
      );
    });

    it("formats a thesis", () => {
      expect(fmt.formatBibliography(smith, 1)).toBe(
        '[1] Jane Smith, "The Evolution of Legal Positivism in the 21st Century," 2020.'
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
