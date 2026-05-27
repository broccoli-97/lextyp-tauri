/**
 * Regression tests for the @retorquere/bibtex-parser swap.
 *
 * The old hand-rolled parser silently mangled real-world data: it `String.replace`d
 * every brace, ignored `@string` definitions, didn't follow `crossref`, and left
 * LaTeX diacritics like `{\"o}` as literal text. Each case below asserts the
 * correct, post-swap behaviour. If any of these regresses we want it loud.
 */
import { describe, it, expect } from "vitest";
import { parseBibtex } from "../src/lib/bib-parser";

describe("bib-parser — features the old regex parser got wrong", () => {
  it("preserves brace-protected runs as plain text (not literal braces)", () => {
    const out = parseBibtex(`
      @book{a,
        title = {The {NATO} Story of {D}NA},
        year = {2020},
      }
    `);
    expect(out).toHaveLength(1);
    // Braces themselves are stripped from output (they're protection markers,
    // not visible text), but the protected runs survive their case.
    expect(out[0].fields.title).toBe("The NATO Story of DNA");
  });

  it("normalises LaTeX diacritics to Unicode", () => {
    const out = parseBibtex(String.raw`
      @article{a,
        author = {Esper, J\"o and Müller, Anna},
        title = {Caf\'e Society},
        year = {2024},
      }
    `);
    // The parser emits diacritics as combining sequences (NFD). Normalise to
    // NFC before asserting so the test is independent of which form the
    // parser happened to pick — the user-visible string is identical.
    const author = out[0].fields.author.normalize("NFC");
    expect(author).toContain("Jö Esper");
    expect(author).toContain("Anna Müller");
    expect(out[0].fields.title.normalize("NFC")).toBe("Café Society");
  });

  it("substitutes @string macros into field values", () => {
    const out = parseBibtex(`
      @string{hlr = "Harvard Law Review"}
      @article{a,
        author = {Doe, Jane},
        journal = hlr,
        year = {2024},
      }
    `);
    expect(out[0].fields.journal).toBe("Harvard Law Review");
  });

  it("follows crossref so inherited fields are visible on the child entry", () => {
    const out = parseBibtex(`
      @book{parent2020,
        editor = {Smith, A.},
        title = {Edited Volume},
        publisher = {Big Press},
        year = {2020},
      }
      @incollection{child,
        author = {Doe, Jane},
        title = {A Chapter},
        crossref = {parent2020},
      }
    `);
    const child = out.find((e) => e.key === "child")!;
    // Year + publisher come from the parent via crossref.
    expect(child.fields.year).toBe("2020");
    expect(child.fields.publisher).toBe("Big Press");
  });

  it("treats case-name authors verbatim instead of splitting on `v`", () => {
    // The old fix-up where the parser thought "v" was a name separator would
    // produce "v Stevenson, Donoghue". The adapter restores natural order.
    const out = parseBibtex(`
      @case{a,
        author = {Donoghue v Stevenson},
        title  = {Donoghue v Stevenson},
        year   = {1932},
      }
    `);
    expect(out[0].fields.author).toBe("Donoghue v Stevenson");
  });

  it("survives a garbage file without throwing", () => {
    // Real-world Zotero exports occasionally contain stray text outside any
    // @entry block, comments, BOMs, etc. The parser must not panic.
    const out = parseBibtex(`
      % a stray comment
      garbage outside any entry
      @book{ok,
        title = {Recoverable},
        year = {2024},
      }
    `);
    expect(out.some((e) => e.key === "ok")).toBe(true);
  });
});
