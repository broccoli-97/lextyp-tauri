import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/lib/citation/registry";
import type { CitationHistoryEntry } from "../../src/types/bib";
import { hart, fuller, donoghue, humanrights, smith } from "../fixtures";

const fmt = getFormatter("chicago");

describe("Chicago formatter", () => {
  describe("full-form citations", () => {
    it("formats a book", () => {
      expect(fmt.formatCitation(hart, "", [], 1)).toBe(
        "H.L.A. Hart, _The Concept of Law_ (Oxford University Press, 1961)"
      );
    });

    it("formats an article", () => {
      expect(fmt.formatCitation(fuller, "", [], 1)).toBe(
        'Lon L. Fuller, "Positivism and Fidelity to Law: A Reply to Professor Hart,"  _Harvard Law Review_ 71 (1958): 630--672'
      );
    });

    it("formats a case", () => {
      expect(fmt.formatCitation(donoghue, "", [], 1)).toBe(
        "Donoghue v Stevenson, _Donoghue v Stevenson_ (1932)"
      );
    });

    it("formats legislation", () => {
      expect(fmt.formatCitation(humanrights, "", [], 1)).toBe(
        "_Human Rights Act_ (1998)"
      );
    });

    it("formats legislation with pinpoint", () => {
      expect(fmt.formatCitation(humanrights, "s 6", [], 1)).toBe(
        "_Human Rights Act_ (1998), s 6"
      );
    });

    it("formats a thesis", () => {
      expect(fmt.formatCitation(smith, "", [], 1)).toBe(
        "Jane Smith, _The Evolution of Legal Positivism in the 21st Century_ (2020)"
      );
    });
  });

  describe("ibid", () => {
    it("returns 'Ibid.' for consecutive same-source cite", () => {
      const history: CitationHistoryEntry[] = [
        { key: "fuller1958", footnoteNumber: 1 },
      ];
      expect(fmt.formatCitation(fuller, "", history, 2)).toBe("Ibid.");
    });

    it("returns 'Ibid., <pinpoint>' with pinpoint", () => {
      const history: CitationHistoryEntry[] = [
        { key: "fuller1958", footnoteNumber: 1 },
      ];
      expect(fmt.formatCitation(fuller, "650", history, 2)).toBe(
        "Ibid., 650"
      );
    });
  });

  describe("short-form citations", () => {
    it("uses short author + truncated title for books", () => {
      const history: CitationHistoryEntry[] = [
        { key: "hart1961", footnoteNumber: 1 },
        { key: "fuller1958", footnoteNumber: 2 },
      ];
      // "The Concept of Law" is 4 words, so no truncation
      expect(fmt.formatCitation(hart, "", history, 3)).toBe(
        "Hart, _The Concept of Law_"
      );
    });

    it("truncates titles longer than 4 words", () => {
      const history: CitationHistoryEntry[] = [
        { key: "fuller1958", footnoteNumber: 1 },
        { key: "hart1961", footnoteNumber: 2 },
      ];
      // Fuller's title: "Positivism and Fidelity to Law: A Reply to Professor Hart" (10 words)
      const result = fmt.formatCitation(fuller, "", history, 3);
      expect(result).toBe("Fuller, _Positivism and Fidelity to..._");
    });

    it("includes pinpoint in short form", () => {
      const history: CitationHistoryEntry[] = [
        { key: "hart1961", footnoteNumber: 1 },
        { key: "fuller1958", footnoteNumber: 2 },
      ];
      expect(fmt.formatCitation(hart, "42", history, 3)).toBe(
        "Hart, _The Concept of Law_, 42"
      );
    });
  });

  describe("edge cases", () => {
    it("returns [unknown reference] for empty key", () => {
      expect(
        fmt.formatCitation({ key: "", type: "book", fields: {} }, "", [], 1)
      ).toBe("[unknown reference]");
    });
  });
});
