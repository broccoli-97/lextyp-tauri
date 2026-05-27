# LexTyp — Architecture, UX & Product Review

Reviewed on 2026-05-27. Severity tags: **[blocker] / [major] / [minor] / [polish]**.

LexTyp is an unusually thoughtful single-developer project. The in-process Typst compiler, the schema-restricted BlockNote (`src/editor/schema.tsx:128`), the source-mapped click-to-jump, and the warm editorial palette together signal a strong design intent — *"a focused, calm WYSIWYG for academic writers who want publication-grade output without LaTeX."* The review below assumes that intent and the implied user (UK/Commonwealth law and humanities students/RAs, given the OSCOLA-first feature density).

---

## 1. Architect's lens

**Strengths.** The frontend/backend split is clean, Zustand-per-concern keeps state legible, the `LexTypWorld` Typst implementation (`src-tauri/src/typst.rs:91`) is the right call (forking a subprocess per keystroke would be untenable), and the `opt-level = 2` workaround for dev mode (`src-tauri/Cargo.toml:33`) is exactly the kind of pragmatic note that distinguishes engineering from prototyping.

### Concerns

- **[blocker] Hand-rolled BibTeX parser is a correctness risk for the target audience.** `src/lib/bib-parser.ts:78` does `value.replace(/[{}]/g, "")`. That destroys the brace-protection convention BibTeX uses to preserve capitalization in titles (`{NATO}`, `{D}NA`, surname accents like `{\'E}sper`). It also has no @string substitution, no `crossref`, and no LaTeX-macro/diacritic normalization (`{\"o}` → `ö`). For a law/humanities user importing a Zotero or Mendeley export, this *will* silently mangle authors and titles. Swap to `@retorquere/bibtex-parser` or `citation-js`.
- **[major] Schema has no version field.** `meta.json` (`src-tauri/src/project.rs:7`) carries `citation_style` and timestamps but no `schema_version`. The day you rename a block type or change a prop, every existing `.lextyp` becomes a silent migration problem. Add `schema_version: 1` now, while files are scarce.
- **[major] PDF worker is loaded from a CDN.** `src/components/PdfPreview.tsx:23` hardcodes `https://unpkg.com/pdfjs-dist@.../pdf.worker.min.mjs`. This breaks offline use (train, conference Wi-Fi), leaks every app launch to a third party, and ties uptime to unpkg. Bundle the worker locally via Vite (`new Worker(new URL(...))`).
- **[major] CSP is disabled.** `tauri.conf.json:25` sets `"csp": null`. Combined with the unpkg dependency above, an XSS via, say, a malicious BibTeX value rendered into the chip popover could exfiltrate documents. The schema makes this currently low-likelihood but the surface is unbounded — write a strict CSP before 1.0.
- **[major] Filesystem commands accept unbounded paths.** `save_project`, `delete_item`, `rename_item`, `read_bib_file` all take `path: String` with no workspace-root scoping (`src-tauri/src/project.rs:43`+). A capability hardening pass — validate that paths are inside the active workspace — would limit blast radius. Tauri's `fs` scope can do part of this declaratively.
- **[major] Cross-component coordination via `window.__lextyp_*` globals.** Five global handles on window (`src/components/Editor.tsx:687`–`701`, called from `src/App.tsx:172`, `src/components/PdfPreview.tsx:248`). CLAUDE.md normalizes this as a "pattern," but it short-circuits React's data flow, blocks any multi-window future, breaks Strict Mode double-mounts cleanly, is invisible to TypeScript, and makes the editor untestable in isolation. Replace with a React context exposing `insertCitation`, `jumpToBlock`, etc., or a tiny event bus that doesn't live on `window`.
- **[major] Compile is not cancellable and not coalesced with the auto-save path.** Editor.tsx debounces compile at 400 ms (line 519) *and* re-runs compile on style/entries changes (line 556). A fast typer switching styles can stack two or three in-flight compiles; the second `tauri::command` does not abort the first, and `LastDocument`'s mutex means whichever finishes last wins. Add an abort token (epoch counter; ignore stale results) and call `compile_typst` on `tokio::task::spawn_blocking` since Typst itself is synchronous and CPU-bound.
- **[major] Includes bypass Typst's package and asset system.** `LexTypWorld::file()` always returns `NotFound` (line 130); inclusion is implemented by inlining serializer output (`src/lib/typst-serializer.ts:43`). This works for the v0 case but blocks images, figures, `@preview/` packages, and bibliography-as-asset — all standard academic needs. Plan a real virtual filesystem (`HashMap<VirtualPath, Bytes>`) backed by the workspace.
- **[minor] `any` is load-bearing across boundaries.** `editorInstance: any` (`workspace-store.ts:23`), `blocks: any[]`, `block as any` casts everywhere the schema crosses the store/serializer boundary. The schema in `schema.tsx` is well-typed; the rest of the app discards that typing. Export `BlockType` from `schema.tsx` (you already do, line 156) and *use* it in the store and serializer.
- **[minor] Module-level workspace restore.** `workspace-store.ts:486` performs `openWorkspace(...)` at import time. If the saved path is stale (USB drive ejected, workspace deleted) the failure is `console.error`'d into the void. Move to an explicit `init()` called from `App.tsx` with proper error UI.
- **[minor] Serializer coverage is thin.** 590 lines of citation/escape/track logic with one test file. Given that the value prop *is* "citation format-free" + correct PDFs, the formatter × entry-type × ibid/short-form matrix deserves table-driven tests with golden Typst snapshots.

---

## 2. Senior Product Manager's lens

**Positioning is the headline question.** The codebase tells two stories. The OSCOLA formatter (`src/lib/citation/oscola.ts`) is 180 lines with real ibid/short-form behavior, the schema knows about `case` / `statute` / `hansard` / `legislation` (`ReferencesPanel.tsx:30`), and the default style is OSCOLA. The other four formatters are 30–60 lines each — closer to stubs than to publication-grade implementations. The README, by contrast, pitches a generic "academic document editor."

- **[major] Pick a wedge and own it.** "LexTyp: the law-school essay editor with one-click citation switching" is defensible, has no good incumbent (Word + Endnote is brittle; LaTeX is a hill nobody at a law faculty climbs), and matches what you've actually built. The cross-domain pitch competes with Overleaf, Authorea, Notion, and Word — none winnable as a solo project. Concretely: lead with OSCOLA, present APA/Harvard/Chicago/IEEE as "also supported," and invest in OSCOLA depth (pinpoints, cross-references, parallel citations) before broadening.
- **[blocker for legal use] No pinpoint UI.** The citation inline content stores only `key` (`schema.tsx:18`). OSCOLA *requires* pinpoints (`Donoghue v Stevenson [1932] AC 562, 580`); without them the formatter's "ibid, 23" branch (`oscola.ts:9`) is unreachable from the UI. This is the single biggest gap between intent and delivery. Add a pinpoint field to the citation chip and surface it in the popover.
- **[major] Bibliography is auto-only.** Users can't include uncited "further reading," reorder, suppress entries, or split into primary/secondary sources — all standard academic asks. Add a `bibliography` block (or props on the auto-generated section) for control.
- **[major] No document settings.** Preamble in `typst-serializer.ts:104` hardcodes 12pt Times, 1.5 leading, 2.54 cm margins, page numbering. Real submissions require: double-spacing (Bluebook, most thesis handbooks), specific margin variants (binding offset for hard-bound theses), serif font choice, line-numbering for legal drafts. A Document Settings panel that writes to `meta.json` and feeds `buildPreamble` is a few days' work and unblocks every actual submission scenario.
- **[major] Compilation errors are surfaced raw.** PdfPreview shows the Typst diagnostic verbatim (`PdfPreview.tsx:331`) — line numbers refer to *generated* Typst source the user has never seen. For the target audience this is incomprehensible. Map at least the most common errors back to the offending block id (you have the source map; same machinery applies).
- **[major] No "saving / saved" affordance.** `isDirty` is tracked but never displayed. Auto-save runs at 2 s; users have to trust it. A "Saved 12 s ago" line near the title or in the status bar is the canonical pattern.
- **[major] License will close doors.** PolyForm Noncommercial covers universities (non-profit) but explicitly excludes a publisher's tooling team, a bar-prep company, or an internal SaaS at a law firm — all natural commercial-adjacent partners. If those aren't in your roadmap, fine; if they might be, AGPL or dual-license is the more standard route.
- **[minor] No comment/track-changes/version-history.** Academic writing happens through supervisor feedback. Single-author with no review trail caps the product at "personal drafting tool." A simple read-only "compare with last commit" using the auto-save snapshots would already be valuable.
- **[minor] No headless / CLI build.** A `.lextyp` archive contains `document.typ` already — but compiling it outside the app requires the user to extract the zip and shell out to a Typst install. A `lextyp build foo.lextyp` would unlock reproducible thesis builds and CI usage.
- **[minor] Update check hits GitHub on every launch.** `StatusBar.tsx:39` calls `check_update` on mount, unauthenticated, no caching. At even modest user counts you'll hit GitHub rate limits and corporate proxies will fail silently. Cache the result for 24 h in localStorage; respect proxy env vars in `reqwest`.

---

## 3. Senior UI/UX Design Manager's lens

**The aesthetic is strong.** The warm Stone-tinged palette, considered tertiary-text lift for chrome legibility (`index.css:30`), gradual heading hierarchy, "safe center" PDF flexbox — these are deliberate, professional choices. The current-line flash overlay (`Editor.tsx:172`) and source-mapped jump are genuinely lovely. What follows are the friction points, ordered by how soon a real user hits them.

### Interaction model

- **[blocker] The global keyboard shim breaks core expectations.** `App.tsx:51` blocks `Ctrl+S, P, N, T, W, R, F, G, H, L, D, J` and `F5/F7`. The intent is "block browser defaults," but the casualties are:
  - **Ctrl+F** — no in-document find. Indispensable for any writing of >2 pages. Build a find bar.
  - **Ctrl+P** — no print preview. Even with PDF export, users expect to print directly.
  - **Ctrl+S** — auto-save is fine, but Ctrl+S is muscle memory; either let it through (no-op + flash a "Saved" toast) or remap to Save As.
  - **Ctrl+G** — block list / outline / "go to" is a natural fit, currently squandered.
- **[major] No keyboard shortcut help.** Tips rotate randomly in the status bar (`StatusBar.tsx:11`) — charming, but the user never learns the system. Add a `?` overlay (cheatsheet) and a Cmd/Ctrl+K command palette (you already have a CitationPicker palette infrastructure).
- **[major] Citation chip popover is read-only.** The popover (`CitationTag.tsx:73`) shows the fields but offers no inline edit, no pinpoint entry, no "remove this citation." Users are forced to context-switch to the References panel, search, edit, return. The chip is the natural touchpoint — make it the editor.
- **[major] Citation display mode is decoupled from style.** Switching from OSCOLA (footnote) to APA (in-text) leaves `citationDisplay = "chip"` unchanged. Infer the sensible default from `formatter.kind` and let users override.
- **[minor] Three ways to open a file, one way to find what you opened.** "+" menu, workspace-name menu, footer SidebarItem (`FilesPanel.tsx:71`) all open files; there's no recents list, no "reopen last closed," and no breadcrumb showing the open document's path.
- **[minor] PDF panel disappears below `md`.** `App.tsx:226` hides the preview on narrow widths with no toggle UI. On a 13" laptop with the sidebar expanded this can trigger unexpectedly. Provide a "show preview" toggle in the status bar.
- **[minor] PDF zoom misses "fit to width" and "fit to page."** Standard buttons in every PDF reader. The 15% step size is also coarse for fine-tuning.

### Information architecture

- **[major] Settings live in the activity bar.** The 3-icon activity bar (Files / References / Settings — `Sidebar.tsx:208`) puts a meta-control at the same hierarchy as workspace content. Convention (VS Code, Notion, Obsidian) is to push Settings to a gear at the bottom of the bar or under the workspace-name menu. The activity bar slot is valuable real-estate; reserve it for primary content modes (e.g., a future "Outline" view).
- **[major] No persistent outline.** `FloatingOutline.tsx` is good as a quick-glance affordance, but a long thesis (50+ pages, dozens of headings) needs a left-rail or floating-panel outline that stays visible. Consider promoting it to an activity-bar mode.
- **[minor] Reference panel doesn't scale.** A user with a 200-entry Zotero export gets a card list filterable by type and search, but no sort (author/year/title), no grouping, no multi-select for "cite all of these." Fine for 20 entries, painful at 200.
- **[minor] Rotating tips in the status bar.** Engaging once, noisy thereafter. Either let users dismiss permanently, or move them to first-launch onboarding.

### Visual polish

- **[polish] Cover page is a special block with a dialog.** Good pattern, but the editor preview of the cover (`CoverPageCard.tsx`) is much less polished than the PDF — users will be confused why the editor doesn't show their layout. Consider an "open to edit" affordance directly on hover.
- **[polish] System-theme follow.** `Light / Dark` only (`SettingsPanel.tsx:48`); add `Auto`.
- **[polish] zh-CN UI doesn't propagate into citation glue text.** Formatters embed English connectors (`oscola.ts:86` `(${publisher} ${year})`); a zh-CN user writing in Chinese still sees English bibliography phrasing for Chinese-language style guides (GB/T 7714 isn't supported at all — natural follow-on for the zh-CN locale).

### Accessibility

- **[major] ARIA coverage is partial.** Toolbars and the citation palette have `aria-label` / `role`; the file tree, the side menu, the rotating tip region, and the status pills don't. The file tree in particular needs `role="tree"` and roving tabindex if it's to be keyboard-navigable.
- **[major] Focus management around dialogs.** `CoverPageDialog` is `role="dialog" aria-modal="true"` but no focus-trap or return-focus-on-close. Same for the citation picker palette and the "+" / workspace menus.
- **[minor] Color-only state in status pills.** The compile-status pill uses color + an icon, which is good; verify in dark mode that the icons hold contrast on the tinted backgrounds.

---

## 4. Top 10, ordered by leverage

1. **Pinpoint field on citations** — unblocks the legal value prop. (1–2 days)
2. **Replace BibTeX parser** with a library; the current one corrupts real-world data. (1 day)
3. **Bundle the PDF.js worker; set a CSP.** Security + offline. (½ day)
4. **Document Settings panel** (font/spacing/margins/page) feeding `buildPreamble`. (2–3 days)
5. **Schema versioning on `meta.json`** before any installed base grows. (½ day)
6. **Map Typst errors back to the source block** the user wrote. The introspector already runs after compile; bind diagnostics to nearest block. (2 days)
7. **Drop the global keyboard shim; build a real Find bar + command palette.** (2–3 days)
8. **Saved/saving indicator** + visible auto-save state. (½ day)
9. **Cancellable / coalesced compile** on `spawn_blocking`. (1 day)
10. **Editable citation in the chip popover** (incl. pinpoint, remove). (1–2 days)

---

## 5. Things that are already very good — keep doing

- The in-process Typst world (`typst.rs`) is the right architectural bet; the source-map metadata + introspector is a delightful application of Typst's query API.
- The auto-save "old doc stays visible during save" pattern (`workspace-store.ts:147`) shows real attention to perceived latency.
- The serializer's character-offset tracking for word-level click-to-jump is a level of polish most editors don't reach.
- The schema-restriction approach (lock the block types to what serializes correctly — `schema.tsx:128`) is the right way to keep the editor honest with the renderer.
- Comments consistently explain *why*, not *what* (e.g. the side-menu placement note at `Editor.tsx:60`, the dblclick/pointerdown threshold at `PdfPreview.tsx:67`). Unusually disciplined for a solo project and worth protecting as the codebase grows.
