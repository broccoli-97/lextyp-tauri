import { FileText } from "lucide-react";
import { useT } from "../lib/i18n";

export interface CoverPageData {
  title: string;
  subtitle: string;
  author: string;
  supervisor: string;
  institution: string;
  department: string;
  date: string;
  wordCount: string;
  extraLines: string;
  layout: string;
}

interface Props {
  data: CoverPageData;
  /** Locale-formatted "today" string used when `data.date === "auto"`. */
  autoDate: string;
  /** Live total word count (from app-store). Used when
   *  `data.wordCount === "auto"`. */
  totalWords: number;
}

/**
 * Read-only render of the cover page used in the inline block and inside
 * the editor dialog's preview pane. Mirrors the printed layout but in a
 * compact, card-shaped form factor (not page-shaped) — the live PDF
 * preview on the right is the authoritative full-page rendering.
 */
export function CoverPagePreview({ data, autoDate, totalWords }: Props) {
  const t = useT();

  const dateText = data.date === "auto" ? autoDate : data.date;
  const wordCountText = (() => {
    if (!data.wordCount || data.wordCount === "off") return "";
    if (data.wordCount === "auto") return String(totalWords);
    // Numeric target: show live count alongside ("X / target").
    if (/^\d+$/.test(data.wordCount)) {
      return `${totalWords} / ${data.wordCount}`;
    }
    return data.wordCount;
  })();

  const metaParts: string[] = [];
  if (data.author) metaParts.push(data.author);
  if (data.institution) metaParts.push(data.institution);
  if (data.department && !data.institution) metaParts.push(data.department);
  if (dateText) metaParts.push(dateText);

  const supervisorLine = data.supervisor
    ? `${t("cover.supervisor")}: ${data.supervisor}`
    : "";

  const extraList = data.extraLines
    ? data.extraLines
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
    : [];

  const isEmpty =
    !data.title &&
    !data.subtitle &&
    !data.author &&
    !data.institution &&
    !data.department &&
    extraList.length === 0;

  if (isEmpty) {
    return (
      <div className="cover-preview cover-preview-empty">
        <div className="cover-preview-empty-icon">
          <FileText size={20} />
        </div>
        <div className="cover-preview-empty-title">
          {t("cover.previewEmpty")}
        </div>
        <div className="cover-preview-empty-hint">
          {t("cover.previewEmptyHint")}
        </div>
      </div>
    );
  }

  return (
    <div className={`cover-preview cover-layout-${data.layout || "classic"}`}>
      {data.title && (
        <div className="cover-preview-title">{data.title}</div>
      )}
      {data.subtitle && (
        <div className="cover-preview-subtitle">{data.subtitle}</div>
      )}
      {metaParts.length > 0 && (
        <div className="cover-preview-meta">
          {metaParts.map((part, i) => (
            <span key={`m-${i}`} className="cover-preview-meta-part">
              {i > 0 && <span className="cover-preview-meta-sep">·</span>}
              <span>{part}</span>
            </span>
          ))}
        </div>
      )}
      {supervisorLine && (
        <div className="cover-preview-supervisor">{supervisorLine}</div>
      )}
      {wordCountText && (
        <div className="cover-preview-wordcount">
          {t("cover.wordCount")}: {wordCountText}
        </div>
      )}
      {extraList.length > 0 && (
        <div className="cover-preview-extra">
          {extraList.map((line, i) => (
            <div key={`e-${i}`}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
