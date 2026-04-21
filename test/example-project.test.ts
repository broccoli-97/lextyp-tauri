import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { serializeToTypst } from "../src/lib/typst-serializer";
import { parseBibtex } from "../src/lib/bib-parser";
import { getFormatter } from "../src/lib/citation/registry";

/**
 * Guards the shipped example project. If a future change breaks the example,
 * this test fires before we cut a release and the download link on the docs
 * site keeps working.
 */
describe("examples/citation-demo.lextyp", () => {
  const lextypPath = "examples/citation-demo.lextyp";

  // Extract the two files we need from the ZIP via the system `unzip -p`.
  // Simpler than pulling in a JS zip dependency for one test.
  const readFromZip = (entry: string) =>
    execSync(`unzip -p ${lextypPath} ${entry}`, { encoding: "utf-8" });

  const blocks = JSON.parse(readFromZip("document.json"));
  const meta = JSON.parse(readFromZip("meta.json"));
  const bib = readFromZip("references.bib");
  const entries = parseBibtex(bib);

  it("has a sensible meta block", () => {
    expect(meta.title).toBeTruthy();
    expect(meta.citation_style).toBe("oscola");
  });

  it("ships a bibliography with every entry that the body cites", () => {
    const cited = new Set<string>();
    for (const block of blocks) {
      for (const inline of block.content ?? []) {
        if (inline.type === "citation" && inline.props?.key) {
          cited.add(inline.props.key);
        }
      }
    }
    expect(cited.size).toBeGreaterThan(0);
    const missing = [...cited].filter((k) => !entries.some((e) => e.key === k));
    expect(missing).toEqual([]);
  });

  it("compiles to Typst under every bundled citation style", async () => {
    const styles = ["oscola", "harvard", "apa", "chicago", "ieee", "plain"] as const;
    for (const style of styles) {
      const formatter = getFormatter(style);
      const out = await serializeToTypst(blocks, entries, formatter);
      expect(out).toContain("#set page");
      expect(out).toContain("Legal Positivism");
      // Every style should produce at least one footnote or cite marker.
      expect(/#footnote|#cite/.test(out)).toBe(true);
    }
  });

  it("emits the #outline() for the tableOfContents block", async () => {
    const formatter = getFormatter("oscola");
    const out = await serializeToTypst(blocks, entries, formatter);
    expect(out).toContain("#outline()");
  });
});
