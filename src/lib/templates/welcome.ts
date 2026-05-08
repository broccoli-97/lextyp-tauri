/**
 * Welcome / tutorial template.
 *
 * A complete sample document the user can open from the empty-state to see
 * every block type and editor feature in context. The shape mirrors what
 * `editor.document` produces, but with `id` omitted — BlockNote regenerates
 * fresh IDs on load, which avoids collisions if the user opens multiple
 * copies.
 *
 * If you add a new block type to the schema, add a demo of it here so the
 * tutorial stays in sync with the feature surface.
 */

import type { ProjectTemplate } from "./types";

const txt = (text: string, styles: Record<string, any> = {}) => ({
  type: "text" as const,
  text,
  styles,
});

const link = (href: string, text: string) => ({
  type: "link" as const,
  href,
  content: [txt(text)],
});

const cite = (key: string) => ({
  type: "citation" as const,
  props: { key },
  content: undefined as any,
});

const para = (...content: any[]) => ({
  type: "paragraph" as const,
  props: {},
  content,
  children: [],
});

const heading = (level: 1 | 2 | 3 | 4, text: string) => ({
  type: "heading" as const,
  props: { level },
  content: [txt(text)],
  children: [],
});

const bullet = (...content: any[]) => ({
  type: "bulletListItem" as const,
  props: {},
  content,
  children: [],
});

const numbered = (...content: any[]) => ({
  type: "numberedListItem" as const,
  props: {},
  content,
  children: [],
});

const check = (checked: boolean, ...content: any[]) => ({
  type: "checkListItem" as const,
  props: { checked },
  content,
  children: [],
});

const blocks: any[] = [
  {
    type: "coverPage",
    props: {
      title: "Welcome to LexTyp",
      subtitle: "A guided tour of the editor",
      author: "LexTyp Team",
      supervisor: "",
      institution: "LexTyp",
      department: "Documentation",
      date: "auto",
      wordCount: "auto",
      extraLines: "",
    },
    content: undefined,
    children: [],
  },

  heading(1, "Introduction"),
  para(
    txt(
      "This document is a guided tour of LexTyp's features. Edit it freely as you read — every block here was created with the same controls available to you. When you're ready to start your own paper, create a fresh document from the sidebar."
    )
  ),
  para(
    txt("Heads-up: ", { bold: true }),
    txt(
      "the editor is "
    ),
    txt("not", { italic: true }),
    txt(
      " a WYSIWYG preview. The PDF on the right is what gets submitted. Editor styling is only approximate; the PDF follows scholarly conventions (12pt serif, 1.5 line spacing, 2.54cm margins) regardless of how the editor surface looks."
    )
  ),

  { type: "tableOfContents", props: {}, content: undefined, children: [] },

  heading(1, "Editor basics"),

  heading(2, "Inline styles"),
  para(
    txt("You can use "),
    txt("bold", { bold: true }),
    txt(" (Ctrl+B), "),
    txt("italic", { italic: true }),
    txt(" (Ctrl+I), "),
    txt("underline", { underline: true }),
    txt(" (Ctrl+U), "),
    txt("strike-through", { strike: true }),
    txt(", and "),
    txt("inline code", { code: true }),
    txt(
      ". Highlight a span and use the formatting toolbar that appears, or use the keyboard shortcuts."
    )
  ),
  para(
    txt(
      "You can also color text or highlight a span — useful for marking todos or emphasising legal terms — like "
    ),
    txt("this red word", { textColor: "red" }),
    txt(" or "),
    txt("this highlighted phrase", { backgroundColor: "yellow" }),
    txt(". External links such as "),
    link("https://typst.app", "typst.app"),
    txt(
      " open in your default browser when you Ctrl+click. A plain click places the caret inside the link so you can edit it."
    )
  ),

  heading(2, "Headings"),
  para(
    txt(
      "Type \"/\" to open the slash menu and search for the heading level you want. LexTyp ships four levels:"
    )
  ),
  bullet(
    txt("Title (H1)", { bold: true }),
    txt(" — the paper title; centred and largest in the PDF.")
  ),
  bullet(
    txt("Section (H2)", { bold: true }),
    txt(" — major sections.")
  ),
  bullet(
    txt("Subsection (H3)", { bold: true }),
    txt(" — finer divisions.")
  ),
  bullet(
    txt("Sub-subsection (H4)", { bold: true }),
    txt(" — bold italic; use sparingly.")
  ),

  heading(2, "Lists"),
  para(txt("Three list styles cover most needs:")),

  bullet(txt("Bullets for unordered enumeration.")),
  bullet(
    txt("Press Enter for the next item; Tab nests, Shift+Tab unnests.")
  ),

  para(txt("Numbered lists are auto-maintained:")),
  numbered(txt("First step — open the slash menu.")),
  numbered(txt("Second step — pick a block type.")),
  numbered(txt("Third step — keep writing.")),

  para(txt("Check-lists are useful for to-do tracking inside a draft:")),
  check(true, txt("Read the welcome tour.")),
  check(false, txt("Open a workspace folder.")),
  check(false, txt("Import a .bib file from the References panel.")),

  heading(1, "Citations"),
  para(
    txt(
      "Press \"/\" and pick \"Citation\", or insert from the References panel in the sidebar. Six built-in styles are switchable from the chip in the editor toolbar:"
    )
  ),
  bullet(
    txt("OSCOLA", { bold: true }),
    txt(" (UK law) — footnotes with ibid / short-form tracking.")
  ),
  bullet(
    txt("APA 7", { bold: true }),
    txt(" — author–date, inline.")
  ),
  bullet(
    txt("Harvard", { bold: true }),
    txt(" — author–date, inline.")
  ),
  bullet(
    txt("Chicago", { bold: true }),
    txt(" — footnotes.")
  ),
  bullet(
    txt("IEEE", { bold: true }),
    txt(" — numeric superscript.")
  ),
  bullet(
    txt("Plain", { bold: true }),
    txt(" — minimal numeric.")
  ),
  para(
    txt(
      "Here is an OSCOLA-style citation in context "
    ),
    cite("hartLaw1961"),
    txt(
      " — it renders as a footnote at the bottom of the PDF page. A second source "
    ),
    cite("dworkin1986"),
    txt(
      " demonstrates a different work, and a repeat of the first "
    ),
    cite("hartLaw1961"),
    txt(
      " should render as \"ibid\" under OSCOLA. Switch the citation style from the toolbar chip to see how the same citations re-format."
    )
  ),

  heading(2, "Bibliography"),
  para(
    txt(
      "When a document contains at least one citation, LexTyp auto-generates a References section at the end of the PDF, in first-cited order. Open the References panel in the sidebar to manage your "
    ),
    txt(".bib", { code: true }),
    txt(
      " entries — drop a file in to import, or add entries one by one through the form."
    )
  ),

  heading(1, "Multi-document projects"),
  para(
    txt(
      "For longer works — theses, dissertations, multi-chapter reports — use the "
    ),
    txt("Include document", { bold: true }),
    txt(" block from the slash menu to compose a master file from separate "),
    txt(".lextyp", { code: true }),
    txt(
      " chapters. Includes are inlined at compile time, with each chapter's bibliography merged into the parent and word counts aggregated across the whole tree."
    )
  ),

  heading(1, "Status bar tour"),
  para(txt("At the bottom of the window:")),
  bullet(
    txt("Compile status (left)", { bold: true }),
    txt(
      " — green when the PDF compiled successfully, red on error, blue while in progress."
    )
  ),
  bullet(
    txt("Tip (left)", { bold: true }),
    txt(" — rotates through hints every 15 seconds.")
  ),
  bullet(
    txt("Word count (right)", { bold: true }),
    txt(
      " — words from the document start up to your cursor, slash, total words across the document and any included files."
    )
  ),

  heading(1, "Saving and exporting"),
  para(
    txt("LexTyp auto-saves every 2 seconds. From the sidebar context menu you can also ")
  ),
  bullet(
    txt("Save As", { bold: true }),
    txt(" — save the current document under a new path.")
  ),
  bullet(
    txt("Export .typ", { bold: true }),
    txt(
      " — export the raw Typst source if you want to compile or post-process it externally."
    )
  ),

  heading(1, "Where to go next"),
  para(
    txt(
      "Delete this document, or rename it and use it as scaffolding for your own paper. The features above are the entire editor surface — there is no hidden depth. If anything looks off in the PDF, that's the authoritative output; adjust your editor content rather than fighting the styling."
    )
  ),
  para(
    txt(
      "Happy writing."
    )
  ),
];

const bibContent = `@book{hartLaw1961,
  author = {Hart, H. L. A.},
  title = {The Concept of Law},
  publisher = {Oxford University Press},
  address = {Oxford},
  year = {1961},
}

@book{dworkin1986,
  author = {Dworkin, Ronald},
  title = {Law's Empire},
  publisher = {Harvard University Press},
  address = {Cambridge, MA},
  year = {1986},
}
`;

export const welcomeTemplate: ProjectTemplate = {
  id: "welcome",
  defaultTitle: "Welcome to LexTyp",
  citationStyle: "oscola",
  bibContent,
  blocks,
};
