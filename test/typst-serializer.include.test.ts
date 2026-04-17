import { describe, it, expect } from "vitest";
import { serializeToTypst, type IncludeResolver } from "../src/lib/typst-serializer";
import type { BibEntry } from "../src/types/bib";

const para = (id: string, text: string) => ({
  id,
  type: "paragraph",
  content: [{ type: "text", text, styles: {} }],
  props: {},
});

const includeBlock = (id: string, path: string, title = "child") => ({
  id,
  type: "documentInclude",
  content: [],
  props: { path, title },
});

const PREAMBLE_MARKER = '#set page(paper: "a4"';

describe("serializeToTypst — documentInclude", () => {
  it("emits empty for include block when no resolver is provided", async () => {
    const out = await serializeToTypst([includeBlock("a", "child.lextyp")]);
    expect(out).toContain(PREAMBLE_MARKER);
    // Preamble appears exactly once
    expect(out.match(/#set page/g)?.length).toBe(1);
    // Body is just the (suppressed) include — no marker text
    expect(out).not.toContain("child.lextyp");
  });

  it("inlines child blocks at the include site, with preamble emitted only once", async () => {
    const resolver: IncludeResolver = async (path) => {
      expect(path).toBe("child.lextyp");
      return {
        blocks: [para("c1", "Child paragraph one"), para("c2", "Child paragraph two")],
        entries: [],
        citationStyle: "oscola",
      };
    };

    const out = await serializeToTypst(
      [
        para("p1", "Root before"),
        includeBlock("inc", "child.lextyp"),
        para("p2", "Root after"),
      ],
      [],
      undefined,
      false,
      resolver
    );

    expect(out.match(/#set page/g)?.length).toBe(1);
    const beforeIdx = out.indexOf("Root before");
    const c1Idx = out.indexOf("Child paragraph one");
    const c2Idx = out.indexOf("Child paragraph two");
    const afterIdx = out.indexOf("Root after");
    expect(beforeIdx).toBeGreaterThan(-1);
    expect(c1Idx).toBeGreaterThan(beforeIdx);
    expect(c2Idx).toBeGreaterThan(c1Idx);
    expect(afterIdx).toBeGreaterThan(c2Idx);
  });

  it("merges child bib entries so child citations format with the root formatter", async () => {
    const childEntry: BibEntry = {
      key: "child2024",
      type: "book",
      fields: { author: "Child, A.", title: "Child Title", year: "2024" },
    };
    const formatter = {
      formatFootnote: (entry: BibEntry) => `FN(${entry.key})`,
      formatBibliography: () => "",
    } as any;

    const resolver: IncludeResolver = async () => ({
      blocks: [
        {
          id: "c1",
          type: "paragraph",
          content: [
            { type: "text", text: "See ", styles: {} },
            { type: "citation", props: { key: "child2024" } },
            { type: "text", text: ".", styles: {} },
          ],
          props: {},
        },
      ],
      entries: [childEntry],
      citationStyle: "oscola",
    });

    const out = await serializeToTypst(
      [includeBlock("inc", "child.lextyp")],
      [],
      formatter,
      false,
      resolver
    );

    expect(out).toContain("#footnote[FN(child2024)]");
  });

  it("breaks include cycles without hanging and emits a skip marker", async () => {
    const resolver: IncludeResolver = async (path) => {
      if (path === "a.lextyp") {
        return {
          blocks: [para("ax", "A body"), includeBlock("ib", "b.lextyp")],
          entries: [],
          citationStyle: "oscola",
        };
      }
      // b.lextyp includes a.lextyp → cycle
      return {
        blocks: [para("bx", "B body"), includeBlock("ia", "a.lextyp")],
        entries: [],
        citationStyle: "oscola",
      };
    };

    const out = await serializeToTypst(
      [includeBlock("root", "a.lextyp")],
      [],
      undefined,
      false,
      resolver
    );

    expect(out).toContain("A body");
    expect(out).toContain("B body");
    expect(out).toContain("// skipped cyclic include: a.lextyp");
  });
});
