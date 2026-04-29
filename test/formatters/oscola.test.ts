import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/lib/citation/registry";
import type { CitationHistoryEntry } from "../../src/types/bib";
import { hart, fuller, donoghue, humanrights, finnis, smith } from "../fixtures";

const fmt = getFormatter("oscola");

describe("OSCOLA formatter", () => {
  describe("full-form citations (first cite)", () => {
    it("formats a book", () => {
      expect(fmt.formatCitation(hart, "", [], 1)).toBe(
        "H.L.A. Hart, _The Concept of Law_ (Oxford University Press 1961)"
      );
    });

    it("formats an article", () => {
      expect(fmt.formatCitation(fuller, "", [], 1)).toBe(
        "Lon L. Fuller, 'Positivism and Fidelity to Law: A Reply to Professor Hart' (1958) 71 _Harvard Law Review_ 630--672"
      );
    });

    it("formats a case", () => {
      expect(fmt.formatCitation(donoghue, "", [], 1)).toBe(
        "_Donoghue v Stevenson_ [1932] UKHL 100"
      );
    });

    it("formats legislation", () => {
      expect(fmt.formatCitation(humanrights, "", [], 1)).toBe(
        "Human Rights Act 1998"
      );
    });

    it("formats legislation with pinpoint", () => {
      expect(fmt.formatCitation(humanrights, "s 6", [], 1)).toBe(
        "Human Rights Act 1998, s 6"
      );
    });

    it("formats an incollection", () => {
      expect(fmt.formatCitation(finnis, "", [], 1)).toBe(
        "John Finnis, 'The Authority of Law in the Predicament of Contemporary Social Theory' in P.M.S. Hacker and Joseph Raz (ed), _Law, Morality, and Society_ (Clarendon Press 1980) 115--137"
      );
    });

    it("formats a PhD thesis", () => {
      expect(fmt.formatCitation(smith, "", [], 1)).toBe(
        "Jane Smith, 'The Evolution of Legal Positivism in the 21st Century' (PhD thesis, University of Oxford 2020)"
      );
    });
  });

  describe("ibid", () => {
    it("returns 'ibid' for consecutive same-source citation", () => {
      const history: CitationHistoryEntry[] = [
        { key: "fuller1958", footnoteNumber: 1 },
      ];
      expect(fmt.formatCitation(fuller, "", history, 2)).toBe("ibid");
    });

    it("returns 'ibid, <pinpoint>' with pinpoint", () => {
      const history: CitationHistoryEntry[] = [
        { key: "fuller1958", footnoteNumber: 1 },
      ];
      expect(fmt.formatCitation(fuller, "650", history, 2)).toBe("ibid, 650");
    });

    it("does not ibid when a different source intervenes", () => {
      const history: CitationHistoryEntry[] = [
        { key: "fuller1958", footnoteNumber: 1 },
        { key: "hart1961", footnoteNumber: 2 },
      ];
      // Fuller again — not ibid, should be short form
      const result = fmt.formatCitation(fuller, "", history, 3);
      expect(result).not.toBe("ibid");
      expect(result).toContain("Fuller");
      expect(result).toContain("(n 1)");
    });
  });

  describe("short-form citations (subsequent cite)", () => {
    it("uses author surname + (n X) for books", () => {
      const history: CitationHistoryEntry[] = [
        { key: "hart1961", footnoteNumber: 1 },
        { key: "fuller1958", footnoteNumber: 2 },
      ];
      expect(fmt.formatCitation(hart, "", history, 3)).toBe("Hart (n 1)");
    });

    it("includes pinpoint after (n X) for books", () => {
      const history: CitationHistoryEntry[] = [
        { key: "hart1961", footnoteNumber: 1 },
        { key: "fuller1958", footnoteNumber: 2 },
      ];
      expect(fmt.formatCitation(hart, "42", history, 3)).toBe("Hart (n 1) 42");
    });

    it("truncates case name at 'v' for short form", () => {
      const history: CitationHistoryEntry[] = [
        { key: "donoghue1932", footnoteNumber: 1 },
        { key: "hart1961", footnoteNumber: 2 },
      ];
      const result = fmt.formatCitation(donoghue, "", history, 3);
      expect(result).toBe("_Donoghue_ (n 1)");
    });

    it("repeats legislation in full (no short form)", () => {
      const history: CitationHistoryEntry[] = [
        { key: "humanrights1998", footnoteNumber: 1 },
        { key: "hart1961", footnoteNumber: 2 },
      ];
      expect(fmt.formatCitation(humanrights, "s 3", history, 3)).toBe(
        "Human Rights Act 1998, s 3"
      );
    });

    it("uses generic short form for articles", () => {
      const history: CitationHistoryEntry[] = [
        { key: "fuller1958", footnoteNumber: 1 },
        { key: "hart1961", footnoteNumber: 2 },
      ];
      expect(fmt.formatCitation(fuller, "", history, 3)).toBe("Fuller (n 1)");
    });
  });

  describe("edge cases", () => {
    it("returns [unknown reference] for entry with empty key", () => {
      const noKey = { key: "", type: "book", fields: { title: "Test" } };
      expect(fmt.formatCitation(noKey, "", [], 1)).toBe("[unknown reference]");
    });

    it("formats book with pinpoint on first cite", () => {
      expect(fmt.formatCitation(hart, "ch 5", [], 1)).toBe(
        "H.L.A. Hart, _The Concept of Law_ (Oxford University Press 1961) ch 5"
      );
    });
  });
});
