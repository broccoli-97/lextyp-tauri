import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/lib/citation/registry";
import { hart, fuller, donoghue, humanrights, smith } from "../fixtures";

const fmt = getFormatter("plain");

describe("Plain formatter", () => {
  describe("full-form citations", () => {
    it("formats a book", () => {
      expect(fmt.formatFootnote(hart, "", [], 1)).toBe(
        "[1] H.L.A. Hart. _The Concept of Law_. 1961."
      );
    });

    it("formats an article", () => {
      expect(fmt.formatFootnote(fuller, "", [], 2)).toBe(
        "[2] Lon L. Fuller. _Positivism and Fidelity to Law: A Reply to Professor Hart_. Harvard Law Review, 71:630--672, 1958."
      );
    });

    it("formats a case", () => {
      expect(fmt.formatFootnote(donoghue, "", [], 1)).toBe(
        "[1] Donoghue v Stevenson. _Donoghue v Stevenson_. 1932."
      );
    });

    it("formats legislation", () => {
      expect(fmt.formatFootnote(humanrights, "", [], 1)).toBe(
        "[1] _Human Rights Act_. 1998."
      );
    });

    it("formats a thesis", () => {
      expect(fmt.formatFootnote(smith, "", [], 1)).toBe(
        "[1] Jane Smith. _The Evolution of Legal Positivism in the 21st Century_. 2020."
      );
    });
  });

  describe("numbering", () => {
    it("uses the footnote number in brackets", () => {
      expect(fmt.formatFootnote(hart, "", [], 5)).toMatch(/^\[5\] /);
    });
  });

  describe("pinpoint", () => {
    it("appends pinpoint to book", () => {
      expect(fmt.formatFootnote(hart, "42", [], 1)).toBe(
        "[1] H.L.A. Hart. _The Concept of Law_. 1961. 42"
      );
    });

    it("appends pinpoint to legislation", () => {
      expect(fmt.formatFootnote(humanrights, "s 6", [], 1)).toBe(
        "[1] _Human Rights Act_. 1998. s 6"
      );
    });
  });

  describe("no ibid behaviour", () => {
    it("repeats full form on consecutive same-source cite", () => {
      const history = [{ key: "hart1961", footnoteNumber: 1 }];
      const result = fmt.formatFootnote(hart, "", history, 2);
      expect(result).toContain("H.L.A. Hart");
      expect(result).toMatch(/^\[2\]/);
    });
  });

  describe("edge cases", () => {
    it("returns [unknown reference] for empty key", () => {
      expect(
        fmt.formatFootnote({ key: "", type: "book", fields: {} }, "", [], 1)
      ).toBe("[unknown reference]");
    });
  });
});
