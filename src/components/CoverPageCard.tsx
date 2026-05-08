import { Pencil } from "lucide-react";
import { useT } from "../lib/i18n";
import { useSettingsStore } from "../stores/settings-store";
import { useAppStore } from "../stores/app-store";
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
 * focused) opens the full editor dialog through the shared
 * `__lextyp_openCoverPageDialog` window function — same pattern the
 * citation/document pickers use to bridge BlockNote block render
 * components and React state living in the Editor.
 */
export function CoverPageCard({ block, editor: _editor }: Props) {
  const t = useT();
  const locale = useSettingsStore((s) => s.locale);
  const totalWords = useAppStore((s) => s.totalWordCount);
  const props = block.props;

  const openDialog = () => {
    const fn = (window as any).__lextyp_openCoverPageDialog;
    if (fn) fn(block);
  };

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
