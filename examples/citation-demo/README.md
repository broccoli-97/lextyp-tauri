# Citation Demo — LexTyp Example Project

A short paper on twentieth-century legal positivism that demonstrates the
**citation format-free** workflow at the heart of LexTyp.

## What's in this folder

- `../citation-demo.lextyp` — the packaged project. **Open this in LexTyp.**
- `references.bib` — nine source entries spanning seven BibTeX entry types
  (`@book`, `@article`, `@case`, `@legislation`, `@incollection`, `@phdthesis`,
  `@inproceedings`).
- A rendered `../example.pdf` is shipped alongside for quick inspection.

## How to open it

1. Launch LexTyp.
2. Use **File → Open File…** (or drag the `.lextyp` onto the sidebar) and pick
   `citation-demo.lextyp`.
3. The document loads with the reference library already populated.

## What to try

The whole point of this demo is to show how LexTyp lets you write without
ever touching citation formatting.

- **Switch citation styles.** The sidebar has a style dropdown — OSCOLA,
  Harvard, APA, Chicago, IEEE, Plain. Every `@key` tag in the body
  re-renders instantly. No manual edits, no re-running a formatter.
- **Insert more citations.** Type `/citation` anywhere in the editor, pick
  an entry from the picker, and it becomes an inline `@key` tag. On
  compile it turns into a properly formatted footnote (or in-text cite,
  depending on the style).
- **See the live preview.** The right-hand PDF panel updates as you type.
  Double-click a paragraph in the PDF to jump to its source in the editor.
- **Try the table of contents block.** The demo uses a `/Contents` block
  at the top — it compiles to Typst's `#outline()` and populates itself
  from the document's headings.
- **Bring in another chapter.** Try `/Include` to pull the contents of
  another `.lextyp` file in at compile time. Includes automatically start
  on a new page so each chapter sits on its own.

## File format reminder

A `.lextyp` file is a ZIP archive containing:

```
meta.json         — title, citation_style, timestamps
document.json     — BlockNote editor state
references.bib    — BibTeX bibliography
document.typ      — cached Typst source (optional; regenerated on load)
```

You can unzip one and edit the pieces by hand. That's how this example
was built — see `build_demo.py` in the parent folder.
