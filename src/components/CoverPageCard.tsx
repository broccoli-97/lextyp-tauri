import { Pencil } from "lucide-react";
import { useT } from "../lib/i18n";
import { useSettingsStore } from "../stores/settings-store";
import { useAppStore } from "../stores/app-store";
import { useEditorBridge } from "../editor/EditorBridge";
import { formatAutoDate } from "../lib/date-format";
import { CoverPagePreview, type CoverPageData } from "./CoverPagePreview";

interface Props {
  block: { id: string; type: "coverPage"; props: CoverPageData };
  editor: any;
}

/**
 * Inline cover-page block render.
 *
 * Read-only preview surface. Clicking the card (or pressing Enter while
 * focused) hands the block back to the Editor through the EditorBridge
 * context, which opens the full editing dialog.
 */
export function CoverPageCard({ block, editor: _editor }: Props) {
  const t = useT();
  const locale = useSettingsStore((s) => s.locale);
  const totalWords = useAppStore((s) => s.totalWordCount);
  const bridge = useEditorBridge();
  const props = block.props;

  const openDialog = () => bridge.openCoverPageDialog(block);

  return (
    <div
      className="cover-page-card"
      contentEditable={false}
      suppressContentEditableWarning
      role="button"
      tabIndex={0}
      onClick={openDialog}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDialog();
        }
      }}
    >
      <div className="cover-page-toolbar">
        <span className="cover-page-tag">{t("cover.tag")}</span>
        <span className="cover-page-edit-hint">
          <Pencil size={11} />
          {t("cover.edit")}
        </span>
      </div>
      <CoverPagePreview
        data={props}
        autoDate={formatAutoDate(locale)}
        totalWords={totalWords}
      />
    </div>
  );
}
