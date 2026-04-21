import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import type { BlockNoteEditorType } from "./schema";

/**
 * Curated slash menu items for academic document editing.
 * Only includes block types relevant to Typst document + citation workflow.
 */
export function getSlashMenuItems(
  editor: BlockNoteEditorType,
  onOpenCitationPicker: () => void,
  onOpenDocumentPicker: () => void
): DefaultReactSuggestionItem[] {
  return [
    {
      title: "Title",
      subtext: "Document title",
      aliases: ["title"],
      group: "Structure",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "heading",
          props: { level: 1 as any },
        });
      },
    },
    {
      title: "Section",
      subtext: "Large section heading",
      aliases: ["section", "heading", "h2"],
      group: "Structure",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "heading",
          props: { level: 2 as any },
        });
      },
    },
    {
      title: "Subsection",
      subtext: "Medium subsection heading",
      aliases: ["subsection", "heading3", "h3"],
      group: "Structure",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "heading",
          props: { level: 3 as any },
        });
      },
    },
    {
      title: "Sub-subsection",
      subtext: "Small sub-subsection heading",
      aliases: ["subsubsection", "heading4", "h4"],
      group: "Structure",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "heading",
          props: { level: 4 as any },
        });
      },
    },
    {
      title: "Paragraph",
      subtext: "Plain text paragraph",
      aliases: ["paragraph", "text", "p"],
      group: "Structure",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "paragraph",
        });
      },
    },
    {
      title: "Citation",
      subtext: "Insert inline citation reference",
      aliases: ["citation", "cite", "reference", "footnote", "oscola"],
      group: "References",
      onItemClick: () => {
        onOpenCitationPicker();
      },
    },
    {
      title: "Include document",
      subtext: "Insert the contents of another document",
      aliases: ["include", "import", "subdoc", "chapter", "embed"],
      group: "References",
      onItemClick: () => {
        onOpenDocumentPicker();
      },
    },
    {
      title: "Contents",
      subtext: "Auto-generated table of contents",
      aliases: ["content", "contents", "toc", "outline"],
      group: "Structure",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "tableOfContents" as any,
        });
      },
    },
    {
      title: "Bullet List",
      subtext: "Unordered list item",
      aliases: ["bullet", "list", "ul"],
      group: "Lists",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "bulletListItem",
        });
      },
    },
    {
      title: "Numbered List",
      subtext: "Ordered list item",
      aliases: ["numbered", "ordered", "ol"],
      group: "Lists",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "numberedListItem",
        });
      },
    },
  ];
}
