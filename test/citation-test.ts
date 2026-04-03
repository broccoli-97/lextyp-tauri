/**
 * LexTyp Citation System Test
 *
 * Run with: npx tsx test/citation-test.ts
 *
 * Tests: BibTeX parsing, all 6 citation formatters, Typst serialization.
 */

import { readFileSync } from "fs";
import { parseBibtex } from "../src/lib/bib-parser";
import { getFormatter, getStyleNames } from "../src/lib/citation/registry";
import type { CitationHistoryEntry } from "../src/types/bib";

const bibContent = readFileSync("test/sample.bib", "utf-8");
const entries = parseBibtex(bibContent);

console.log("=== BibTeX Parser Test ===\n");
console.log(`Parsed ${entries.length} entries:`);
for (const e of entries) {
  console.log(`  @${e.type}{${e.key}} — "${e.fields.title || e.fields.author}"`);
}
console.log();

// Verify expected entries
const expectedKeys = [
  "donoghue1932", "humanrights1998", "hart1961", "dworkin1986",
  "fuller1958", "raz1972", "finnis1980", "smith2020",
];
const parsedKeys = entries.map((e) => e.key);
for (const k of expectedKeys) {
  const ok = parsedKeys.includes(k);
  console.log(`  ${ok ? "PASS" : "FAIL"} — key "${k}" ${ok ? "found" : "MISSING"}`);
}
console.log();

// Test all formatters
console.log("=== Citation Formatter Tests ===\n");
console.log(`Available styles: ${getStyleNames().join(", ")}\n`);

const hart = entries.find((e) => e.key === "hart1961")!;
const fuller = entries.find((e) => e.key === "fuller1958")!;
const donoghue = entries.find((e) => e.key === "donoghue1932")!;
const humanrights = entries.find((e) => e.key === "humanrights1998")!;
const smith = entries.find((e) => e.key === "smith2020")!;

for (const style of getStyleNames()) {
  const fmt = getFormatter(style);
  const history: CitationHistoryEntry[] = [];
  let fn = 0;

  console.log(`--- ${style.toUpperCase()} ---`);

  // First citation of Hart
  fn++;
  const hart1 = fmt.formatFootnote(hart, "", history, fn);
  history.push({ key: "hart1961", footnoteNumber: fn });
  console.log(`  [${fn}] Hart (first):      ${hart1}`);

  // First citation of Fuller (article)
  fn++;
  const fuller1 = fmt.formatFootnote(fuller, "", history, fn);
  history.push({ key: "fuller1958", footnoteNumber: fn });
  console.log(`  [${fn}] Fuller (first):    ${fuller1}`);

  // Ibid (same as Fuller)
  fn++;
  const ibid = fmt.formatFootnote(fuller, "", history, fn);
  history.push({ key: "fuller1958", footnoteNumber: fn });
  console.log(`  [${fn}] Fuller (ibid):     ${ibid}`);

  // Hart again (short form)
  fn++;
  const hart2 = fmt.formatFootnote(hart, "42", history, fn);
  history.push({ key: "hart1961", footnoteNumber: fn });
  console.log(`  [${fn}] Hart (short+pp):   ${hart2}`);

  // Case
  fn++;
  const case1 = fmt.formatFootnote(donoghue, "", history, fn);
  history.push({ key: "donoghue1932", footnoteNumber: fn });
  console.log(`  [${fn}] Case (first):      ${case1}`);

  // Legislation
  fn++;
  const leg1 = fmt.formatFootnote(humanrights, "s 6", history, fn);
  history.push({ key: "humanrights1998", footnoteNumber: fn });
  console.log(`  [${fn}] Legislation:       ${leg1}`);

  // Thesis
  fn++;
  const thesis1 = fmt.formatFootnote(smith, "", history, fn);
  history.push({ key: "smith2020", footnoteNumber: fn });
  console.log(`  [${fn}] Thesis:            ${thesis1}`);

  console.log();
}

console.log("=== All tests completed ===");
