import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";

// Custom inline content: Citation tag (@key)
export const Citation = createReactInlineContentSpec(
  {
    type: "citation" as const,
    propSchema: {
      key: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const key = props.inlineContent.props.key;
      return (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] font-semibold cursor-default select-none"
          style={{
            backgroundColor: "var(--accent-light)",
            color: "var(--accent)",
            border: "1px solid rgba(35, 131, 226, 0.2)",
          }}
          data-citation-key={key}
        >
          @{key}
        </span>
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
