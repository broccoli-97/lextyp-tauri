import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  blockTypeSelectItems,
  useDictionary,
} from "@blocknote/react";

// Only expose toolbar controls whose output the Typst serializer actually
// renders. Alignment, file/image, nest/unnest, and code-style buttons are
// intentionally dropped — they're either unsupported by the serializer or
// out of scope for this app.
export function EditorFormattingToolbar() {
  const dict = useDictionary();
  // Match the schema: paragraph, heading levels 1–4, and the three list
  // types. Drop H5/H6, quote, toggle-headings, and toggle list which the
  // schema doesn't include.
  const blockItems = blockTypeSelectItems(dict).filter((item) => {
    if (item.type === "heading") {
      const level = item.props?.level;
      const toggle = item.props?.isToggleable;
      return !toggle && typeof level === "number" && level >= 1 && level <= 4;
    }
    return item.type === "paragraph"
      || item.type === "bulletListItem"
      || item.type === "numberedListItem";
  });

  return (
    <FormattingToolbar>
      <BlockTypeSelect key="blockTypeSelect" items={blockItems} />

      <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
      <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
      <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
      <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />

      <ColorStyleButton key="colorStyleButton" />

      <CreateLinkButton key="createLinkButton" />
    </FormattingToolbar>
  );
}
