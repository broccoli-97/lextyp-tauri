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
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold cursor-default select-none"
          data-citation-key={key}
        >
          @{key}
        </span>
      );
    },
  }
);

// Build the custom schema extending defaults
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
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
