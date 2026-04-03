import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { getDefaultReactSlashMenuItems } from "@blocknote/react";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import type { BlockNoteEditorType } from "./schema";

export function getSlashMenuItems(
  editor: BlockNoteEditorType
): DefaultReactSuggestionItem[] {
  const defaults = getDefaultReactSlashMenuItems(editor as any);

  const customItems: DefaultReactSuggestionItem[] = [
    {
      title: "Section",
      subtext: "Large section heading",
      aliases: ["section", "heading", "h1"],
      group: "Headings",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "heading",
          props: { level: 1 as any },
        });
      },
    },
    {
      title: "Subsection",
      subtext: "Medium subsection heading",
      aliases: ["subsection", "heading2", "h2"],
      group: "Headings",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "heading",
          props: { level: 2 as any },
        });
      },
    },
    {
      title: "Sub-subsection",
      subtext: "Small sub-subsection heading",
      aliases: ["subsubsection", "heading3", "h3"],
      group: "Headings",
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor as any, {
          type: "heading",
          props: { level: 3 as any },
        });
      },
    },
  ];

  return [...customItems, ...defaults];
}
