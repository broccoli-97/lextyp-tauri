/**
 * Golden snapshots for `serializeToTypst`.
 *
 * The formatter unit tests already cover `formatCitation` in isolation. These
 * tests exercise the *whole* serializer pipeline — preamble + body + footnote
 * threading + bibliography — and freeze the output as a snapshot so future
 * changes (preamble tweak, new escape, formatter regression) surface clearly
 * in the diff instead of being hidden by silently-correct test code.
 *
 * The `__track`/`__w` metadata markers carry BlockNote block IDs that are
 * not stable across runs; the `normalize` helper strips them before snapshot
 * so we capture *semantic* output, not block-id soup. A separate test in
 * `typst-serializer.include.test.ts` covers the source-mapping side already.
 */
import { describe, it, expect } from "vitest";
import { serializeToTypst } from "../src/lib/typst-serializer";
import { getFormatter } from "../src/lib/citation/registry";
import { hart, fuller, donoghue } from "./fixtures";

const para = (text: string, extra: object = {}) => ({
  id: "p-" + text.slice(0, 6),
  type: "paragraph" as const,
  content: [{ type: "text" as const, text, styles: {} }],
  props: {},
  ...extra,
});

const cite = (key: string) => ({
  id: "c-" + key,
  type: "paragraph" as const,
  content: [
    { type: "text" as const, text: "See ", styles: {} },
    { type: "citation" as const, props: { key } },
    { type: "text" as const, text: ".", styles: {} },
  ],
  props: {},
});

/**
 * Normalise serializer output for stable snapshots:
 *   • strip block-ID-bearing `__track`/`__w` calls (IDs are non-deterministic)
 *   • collapse adjacent blank lines (they're a frequent target of polish edits)
 */
function normalize(out: string): string {
  return out
    .replace(/#__track\("[^"]+"\)/g, "#__track(<id>)")
    .replace(/#__w\("[^"]+",\d+\);/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

describe("serializeToTypst — preamble", () => {
  it("emits stable preamble for an empty document", async () => {
    const out = await serializeToTypst([]);
    // Preamble alone — no body, no bibliography.
    expect(normalize(out)).toMatchInlineSnapshot(`
      "#set page(paper: "a4", margin: 2.54cm, numbering: "1")
      #set text(size: 12pt, font: ("Times New Roman", "Times", "Libertinus Serif"))
      #set par(justify: true, leading: 1em)
      #show link: it => underline(text(fill: rgb("#2563eb"), it))
      #show heading.where(level: 1): it => align(center, it)
      #show heading.where(level: 1): set text(size: 17pt, weight: "bold")
      #show heading.where(level: 2): set text(size: 14pt, weight: "bold")
      #show heading.where(level: 3): set text(size: 12pt, weight: "bold")
      #show heading.where(level: 4): set text(size: 12pt, weight: "bold", style: "italic")
      #show heading.where(level: 1): set block(above: 2.4em, below: 1.4em)
      #show heading.where(level: 2): set block(above: 1.6em, below: 0.9em)
      #show heading.where(level: 3): set block(above: 1.3em, below: 0.7em)
      #show heading.where(level: 4): set block(above: 1.1em, below: 0.6em)
      #show footnote.entry: set text(size: 10pt)
      #show footnote.entry: set par(leading: 0.55em)"
    `);
  });
});

describe("serializeToTypst — OSCOLA pipeline", () => {
  const oscola = getFormatter("oscola");

  it("threads footnotes for first-cite + ibid + short-form across a document", async () => {
    const blocks = [
      para("Intro."),
      cite("hart1961"),
      cite("hart1961"), // ibid
      cite("fuller1958"),
      cite("hart1961"), // back-reference → short form (n X)
    ];
    const out = await serializeToTypst(
      blocks as any,
      [hart, fuller],
      oscola,
      false,
    );
    const body = normalize(out);

    // First cite → full form in a footnote
    expect(body).toContain(
      "#footnote[H.L.A. Hart, _The Concept of Law_ (Oxford University Press 1961)]",
    );
    // Immediate repeat → ibid
    expect(body).toContain("#footnote[ibid]");
    // Different source intervening
    expect(body).toContain("#footnote[Lon L. Fuller");
    // Back-reference → short form referring to footnote 1 (the first Hart cite)
    expect(body).toContain("#footnote[Hart (n 1)]");

    // Bibliography appears once, with both cited works
    expect(body.match(/= References/g)?.length).toBe(1);
    expect(body).toContain("_The Concept of Law_");
    expect(body).toContain("Lon L. Fuller");
  });

  it("formats a case with italic parties and full citation block", async () => {
    const out = await serializeToTypst(
      [cite("donoghue1932")] as any,
      [donoghue],
      oscola,
      false,
    );
    expect(normalize(out)).toContain(
      "#footnote[_Donoghue v Stevenson_ [1932] UKHL 100]",
    );
  });
});

describe("serializeToTypst — escaping", () => {
  it("escapes Typst-special characters in body text", async () => {
    const out = await serializeToTypst(
      [para("Section #1 _emph_ *bold* @author")] as any,
    );
    const body = normalize(out);
    // Each special should be backslash-escaped, not interpreted as markup.
    expect(body).toContain("Section \\#1 \\_emph\\_ \\*bold\\* \\@author");
  });

  it("renders headings with the correct level prefix", async () => {
    const blocks = [
      { id: "h1", type: "heading", content: [{ type: "text", text: "Title", styles: {} }], props: { level: 1 } },
      { id: "h2", type: "heading", content: [{ type: "text", text: "Section", styles: {} }], props: { level: 2 } },
    ];
    const out = await serializeToTypst(blocks as any);
    const body = normalize(out);
    expect(body).toMatch(/^= Title$/m);
    expect(body).toMatch(/^== Section$/m);
  });
});
