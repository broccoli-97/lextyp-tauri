import { describe, it, expect } from "vitest";
import { getFormatter } from "../../src/lib/citation/registry";
import { hart, fuller, donoghue, humanrights, smith } from "../fixtures";

const fmt = getFormatter("harvard");

describe("Harvard formatter", () => {
  describe("full-form citations", () => {
    it("formats a book", () => {
      expect(fmt.formatFootnote(hart, "", [], 1)).toBe(
        "H.L.A. Hart (1961) _The Concept of Law_. Oxford University Press."
      );
    });

    it("formats an article", () => {
      expect(fmt.formatFootnote(fuller, "", [], 1)).toBe(
        "Lon L. Fuller (1958) 'Positivism and Fidelity to Law: A Reply to Professor Hart', _Harvard Law Review_, vol. 71, pp. 630--672."
      );
    });

    it("formats a case", () => {
      expect(fmt.formatFootnote(donoghue, "", [], 1)).toBe(
        "Donoghue v Stevenson (1932) _Donoghue v Stevenson_. "
      );
    });

    it("formats legislation", () => {
      expect(fmt.formatFootnote(humanrights, "", [], 1)).toBe(
        " (1998) _Human Rights Act_. "
      );
    });

    it("formats a thesis", () => {
      expect(fmt.formatFootnote(smith, "", [], 1)).toBe(
        "Jane Smith (2020) _The Evolution of Legal Positivism in the 21st Century_. "
      );
    });
  });

  describe("pinpoint", () => {
    it("appends pinpoint to book", () => {
      expect(fmt.formatFootnote(hart, "42", [], 1)).toBe(
        "H.L.A. Hart (1961) _The Concept of Law_. Oxford University Press. 42"
      );
    });

    it("appends pinpoint to legislation", () => {
      expect(fmt.formatFootnote(humanrights, "s 6", [], 1)).toBe(
        " (1998) _Human Rights Act_.  s 6"
      );
    });
  });

  describe("no ibid behaviour", () => {
    it("repeats full form on consecutive same-source cite", () => {
      const history = [{ key: "hart1961", footnoteNumber: 1 }];
      const result = fmt.formatFootnote(hart, "", history, 2);
      expect(result).toBe(
        "H.L.A. Hart (1961) _The Concept of Law_. Oxford University Press."
      );
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
