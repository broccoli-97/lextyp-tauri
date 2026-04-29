import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/lib/citation/registry";
import { hart, fuller, donoghue, humanrights, smith } from "../fixtures";

const fmt = getFormatter("harvard");

describe("Harvard formatter", () => {
  it("declares in-text kind", () => {
    expect(fmt.kind).toBe("in-text");
  });

  describe("in-text citation (formatCitation)", () => {
    it("produces (Author Year) for a book", () => {
      expect(fmt.formatCitation(hart, "", [], 1)).toBe("(Hart 1961)");
    });

    it("produces (Author Year) for an article", () => {
      expect(fmt.formatCitation(fuller, "", [], 1)).toBe("(Fuller 1958)");
    });

    it("falls back to title when there is no author", () => {
      expect(fmt.formatCitation(humanrights, "", [], 1)).toBe(
        "(Human Rights Act 1998)"
      );
    });

    it("appends a pinpoint after a comma", () => {
      expect(fmt.formatCitation(hart, "p. 42", [], 1)).toBe("(Hart 1961, p. 42)");
    });
  });

  describe("bibliography entry (formatBibliography)", () => {
    it("formats a book", () => {
      expect(fmt.formatBibliography(hart, 1)).toBe(
        "H.L.A. Hart (1961) _The Concept of Law_. Oxford University Press."
      );
    });

    it("formats an article", () => {
      expect(fmt.formatBibliography(fuller, 1)).toBe(
        "Lon L. Fuller (1958) 'Positivism and Fidelity to Law: A Reply to Professor Hart', _Harvard Law Review_, vol. 71, pp. 630--672."
      );
    });

    it("formats a case", () => {
      expect(fmt.formatBibliography(donoghue, 1)).toBe(
        "Donoghue v Stevenson (1932) _Donoghue v Stevenson_. "
      );
    });

    it("formats legislation", () => {
      expect(fmt.formatBibliography(humanrights, 1)).toBe(
        " (1998) _Human Rights Act_. "
      );
    });

    it("formats a thesis", () => {
      expect(fmt.formatBibliography(smith, 1)).toBe(
        "Jane Smith (2020) _The Evolution of Legal Positivism in the 21st Century_. "
      );
    });
  });

  describe("edge cases", () => {
    it("returns [unknown reference] for empty key in formatCitation", () => {
      expect(
        fmt.formatCitation({ key: "", type: "book", fields: {} }, "", [], 1)
      ).toBe("[unknown reference]");
    });

    it("returns [unknown reference] for empty key in formatBibliography", () => {
      expect(
        fmt.formatBibliography({ key: "", type: "book", fields: {} }, 1)
      ).toBe("[unknown reference]");
    });
  });
});
