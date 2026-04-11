/**
 * Shared test fixtures — BibTeX entries parsed from sample.bib.
 *
 * Import these in test files instead of re-parsing each time.
 */
import { readFileSync } from "fs";
import { parseBibtex } from "../src/lib/bib-parser";
import type { BibEntry } from "../src/types/bib";

export const bibContent = readFileSync("test/sample.bib", "utf-8");
export const allEntries = parseBibtex(bibContent);

function find(key: string): BibEntry {
  const e = allEntries.find((e) => e.key === key);
  if (!e) throw new Error(`Fixture entry "${key}" not found in sample.bib`);
  return e;
}

export const hart = find("hart1961");
export const dworkin = find("dworkin1986");
export const fuller = find("fuller1958");
export const raz = find("raz1972");
export const donoghue = find("donoghue1932");
export const humanrights = find("humanrights1998");
export const finnis = find("finnis1980");
export const smith = find("smith2020");
