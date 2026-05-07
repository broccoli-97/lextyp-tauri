import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { createReactBlockSpec, createReactInlineContentSpec } from "@blocknote/react";
import { FileText, ListTree } from "lucide-react";
import { CitationTag } from "../components/CitationTag";

// Custom inline content: Citation tag.
//
// Visual appearance is delegated to <CitationTag/>, which subscribes to the
// `citationDisplay` setting on the reference store and switches between the
// `@key` chip (with a details popover) and a numbered superscript that mirrors
// the compiled PDF.
export const Citation = createReactInlineContentSpec(
  {
    type: "citation" as const,
    propSchema: {
      key: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => <CitationTag entryKey={props.inlineContent.props.key} />,
  }
);

// Custom block: Document include — references another .lextyp whose contents
// are inlined at compile time. Non-editable; the card shows the target title
// and path so authors can see the chain at a glance.
export const DocumentInclude = createReactBlockSpec(
  {
    type: "documentInclude" as const,
    propSchema: {
      path: { default: "" },
      title: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { path, title } = props.block.props;
      const displayPath = (path || "").replace(/\\/g, "/");
      return (
        <div
          className="my-1 w-full flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 select-none"
          data-include-path={path}
        >
          <FileText size={14} className="text-[var(--accent)] shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
              {title || "Untitled"}
            </div>
            {displayPath && (
              <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                {displayPath}
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide shrink-0">
            Include
          </span>
        </div>
      );
    },
  }
);

// Custom block: Table of contents — compiles to Typst's #outline() so the
// PDF gets an auto-generated table of contents built from the document's
// headings. Non-editable; shown in the editor as a simple placeholder card.
export const TableOfContents = createReactBlockSpec(
  {
    type: "tableOfContents" as const,
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      return (
        <div
          className="my-1 w-full flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 select-none"
        >
          <ListTree size={14} className="text-[var(--accent)] shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-[var(--text-primary)]">
              Contents
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              Auto-generated from headings at compile time
            </div>
          </div>
          <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide shrink-0">
            TOC
          </span>
        </div>
      );
    },
  }
);

// Restrict the schema to block types the Typst serializer handles.
// Anything else (codeBlock, quote, toggleListItem, image, video, audio, file,
// table, divider) would silently drop or degrade during PDF compilation, so
// we keep them out of the editor entirely — that also hides them from the
// formatting toolbar's block-type dropdown (triggered by double-click).
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    checkListItem: defaultBlockSpecs.checkListItem,
    documentInclude: DocumentInclude(),
    tableOfContents: TableOfContents(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    citation: Citation,
  },
  styleSpecs: {
    ...defaultStyleSpecs,
  },
});

// Export types for use elsewhere
export type BlockNoteEditorType = typeof schema.BlockNoteEditor;
export type BlockType = typeof schema.Block;
export type PartialBlockType = typeof schema.PartialBlock;
