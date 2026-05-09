import { useCallback, useEffect, useState } from "react";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import { useT } from "../lib/i18n";
import { useSettingsStore } from "../stores/settings-store";
import { useAppStore } from "../stores/app-store";
import { formatAutoDate } from "../lib/date-format";
import { CoverPagePreview, type CoverPageData } from "./CoverPagePreview";

const DEFAULT_DATA: CoverPageData = {
  title: "",
  subtitle: "",
  author: "",
  supervisor: "",
  institution: "",
  department: "",
  date: "auto",
  wordCount: "off",
  extraLines: "",
  layout: "classic",
};

interface Props {
  open: boolean;
  block: { id: string; props: any } | null;
  editor: any;
  onClose: () => void;
}

/**
 * Dialog editor for the cover page block.
 *
 * Uses a draft + commit pattern (Save / Cancel buttons) rather than the
 * "save on every keystroke" model the inline block previously had — this
 * matches the diagram's UX and avoids spamming the Typst compiler while
 * the user is mid-edit. The draft is initialised from the block's current
 * props on every open, and discarded if the user cancels.
 */
export function CoverPageDialog({ open, block, editor, onClose }: Props) {
  const t = useT();
  const locale = useSettingsStore((s) => s.locale);
  const totalWords = useAppStore((s) => s.totalWordCount);

  const [draft, setDraft] = useState<CoverPageData>(DEFAULT_DATA);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (open && block) {
      setDraft({ ...DEFAULT_DATA, ...block.props });
      setShowPreview(true);
    }
  }, [open, block]);

  // Esc closes the dialog. Mirrors the Cancel button — discards the draft.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const update = useCallback(
    (patch: Partial<CoverPageData>) => setDraft((d) => ({ ...d, ...patch })),
    []
  );

  const handleSave = useCallback(() => {
    if (!block) return;
    editor.updateBlock(block, { props: { ...draft } });
    onClose();
  }, [block, editor, draft, onClose]);

  const handleReset = useCallback(() => setDraft(DEFAULT_DATA), []);

  if (!open || !block) return null;

  return (
    <div
      className="cover-dialog-overlay"
      onMouseDown={(e) => {
        // Click outside the panel closes (cancel-equivalent).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cover-dialog" role="dialog" aria-modal="true">
        {/* Header — single line with the dialog name on the left and the
            preview-toggle + close button on the right. The earlier
            decorative L logo + tag + subtitle stripe was three pieces of
            chrome conveying one fact ("you're in the cover-page editor"),
            which is already obvious from the modal context. */}
        <div className="cover-dialog-header">
          <div className="cover-dialog-titlegroup">
            <div className="cover-dialog-subtitle">
              {t("cover.dialogSubtitle")}
            </div>
          </div>
          <div className="cover-dialog-header-right">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className={`btn btn-quiet btn-sm ${showPreview ? "is-active" : ""}`}
              title={t("cover.togglePreview")}
            >
              <Eye size={13} />
              {t("cover.preview")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="icon-btn icon-btn-sm"
              title={t("cover.close")}
              aria-label={t("cover.close")}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="cover-dialog-body">
          {showPreview && (
            <div className="cover-dialog-preview-wrap">
              <CoverPagePreview
                data={draft}
                autoDate={formatAutoDate(locale)}
                totalWords={totalWords}
              />
            </div>
          )}

          <div className="cover-dialog-form">
            <FormField label={t("cover.title")} required>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder={t("cover.titlePlaceholder")}
                className="input cover-form-input"
                autoFocus
              />
            </FormField>

            <FormField label={t("cover.subtitle")}>
              <input
                type="text"
                value={draft.subtitle}
                onChange={(e) => update({ subtitle: e.target.value })}
                placeholder={t("cover.subtitlePlaceholder")}
                className="input cover-form-input cover-form-italic"
              />
            </FormField>

            <div className="cover-form-row">
              <FormField label={t("cover.author")}>
                <input
                  type="text"
                  value={draft.author}
                  onChange={(e) => update({ author: e.target.value })}
                  placeholder={t("cover.authorPlaceholder")}
                  className="input cover-form-input"
                />
              </FormField>
              <FormField label={t("cover.supervisor")} hint={t("cover.optional")}>
                <input
                  type="text"
                  value={draft.supervisor}
                  onChange={(e) => update({ supervisor: e.target.value })}
                  placeholder={t("cover.supervisorPlaceholder")}
                  className="input cover-form-input"
                />
              </FormField>
            </div>

            <div className="cover-form-row">
              <FormField label={t("cover.institution")}>
                <input
                  type="text"
                  value={draft.institution}
                  onChange={(e) => update({ institution: e.target.value })}
                  placeholder={t("cover.institutionPlaceholder")}
                  className="input cover-form-input"
                />
              </FormField>
              <FormField label={t("cover.department")} hint={t("cover.optional")}>
                <input
                  type="text"
                  value={draft.department}
                  onChange={(e) => update({ department: e.target.value })}
                  placeholder={t("cover.departmentPlaceholder")}
                  className="input cover-form-input"
                />
              </FormField>
            </div>

            <div className="cover-form-row">
              <FormField label={t("cover.date")}>
                <DateInput
                  value={draft.date}
                  onChange={(v) => update({ date: v })}
                  autoText={formatAutoDate(locale)}
                  t={t}
                />
              </FormField>
              <FormField label={t("cover.wordCount")}>
                <WordCountInput
                  value={draft.wordCount}
                  onChange={(v) => update({ wordCount: v })}
                  totalWords={totalWords}
                  t={t}
                />
              </FormField>
            </div>

            <FormField
              label={t("cover.additionalLines")}
              hint={t("cover.additionalLinesHint")}
            >
              <textarea
                value={draft.extraLines}
                onChange={(e) => update({ extraLines: e.target.value })}
                placeholder={t("cover.extraPlaceholder")}
                className="input cover-form-textarea"
                rows={3}
              />
            </FormField>

            <FormField label={t("cover.layout")}>
              <LayoutSelector
                value={draft.layout}
                onChange={(v) => update({ layout: v })}
                t={t}
              />
            </FormField>
          </div>
        </div>

        <div className="cover-dialog-footer">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-quiet btn-sm"
            title={t("cover.resetDefaultsHint")}
          >
            <RotateCcw size={13} />
            {t("cover.resetDefaults")}
          </button>
          <div className="cover-dialog-footer-right">
            <button type="button" onClick={onClose} className="btn btn-quiet">
              {t("cover.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
            >
              <Check size={14} />
              {t("cover.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cover-form-field">
      <div className="cover-form-label-row">
        <label className="cover-form-label">
          {label}
          {required && <span className="cover-form-required">*</span>}
        </label>
        {hint && <span className="cover-form-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function DateInput({
  value,
  onChange,
  autoText,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  autoText: string;
  t: (k: any) => string;
}) {
  const isAuto = value === "auto";
  const display = isAuto ? autoText : value;
  return (
    <div className="cover-form-with-chip">
      <input
        type="text"
        value={display}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("cover.datePlaceholder")}
        className="input cover-form-input"
      />
      <button
        type="button"
        onClick={() => onChange(isAuto ? "" : "auto")}
        className={`cover-auto-chip ${isAuto ? "is-active" : ""}`}
        title={isAuto ? t("cover.dateAutoActive") : t("cover.dateAutoSet")}
      >
        <span className="cover-auto-chip-dot" />
        {t("cover.dateAuto")}
      </button>
    </div>
  );
}

/**
 * Word-count control matching the diagram's `2940 / 3000` layout.
 *
 * The state lives in a single string prop with three forms:
 *   "off"           — count omitted from the cover entirely
 *   "auto"          — live count only (no target)
 *   "<number>"      — live count + that numeric target ("X / Y")
 *
 * The live count side is read-only (always = current totalWords); the
 * target side is an editable digits-only input. Clearing the target while
 * shown drops back to "auto"; clicking the chip toggles the whole thing
 * off/on (where "on" defaults to "auto").
 */
function WordCountInput({
  value,
  onChange,
  totalWords,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  totalWords: number;
  t: (k: any) => string;
}) {
  const isOff = value === "off" || value === "";
  const isAuto = value === "auto";
  const numericTarget =
    !isOff && !isAuto && /^\d+$/.test(value) ? value : "";

  return (
    <div className="cover-form-with-chip">
      <div
        className={`cover-wordcount-fields ${isOff ? "is-disabled" : ""}`}
      >
        <span className="cover-wordcount-live" aria-label={t("cover.wordCount")}>
          {isOff ? "—" : String(totalWords)}
        </span>
        <span className="cover-wordcount-sep">/</span>
        <input
          type="text"
          inputMode="numeric"
          value={numericTarget}
          disabled={isOff}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, "");
            // Empty target while shown → fall back to bare auto. Empty
            // while off stays off (defensive).
            if (!digits) onChange(isOff ? "off" : "auto");
            else onChange(digits);
          }}
          placeholder={t("cover.targetPlaceholder")}
          className="cover-wordcount-target"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(isOff ? "auto" : "off")}
        className={`cover-auto-chip ${!isOff ? "is-active" : ""}`}
        title={isOff ? t("cover.wordCountAutoSet") : t("cover.wordCountAutoActive")}
      >
        <span className="cover-auto-chip-dot" />
        {t("cover.wordCountAuto")}
      </button>
    </div>
  );
}

const LAYOUT_OPTIONS: { id: string; labelKey: any }[] = [
  { id: "classic", labelKey: "cover.layoutClassic" },
  { id: "centered", labelKey: "cover.layoutCentered" },
  { id: "minimal", labelKey: "cover.layoutMinimal" },
];

function LayoutSelector({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: (k: any) => string;
}) {
  return (
    <div className="cover-layout-selector">
      {LAYOUT_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`cover-layout-option ${value === opt.id ? "is-active" : ""}`}
          aria-pressed={value === opt.id}
        >
          <div className="cover-layout-mock">
            <LayoutMock layout={opt.id} />
          </div>
          <div className="cover-layout-label">{t(opt.labelKey)}</div>
        </button>
      ))}
    </div>
  );
}

/** Tiny SVG-style mock that hints at each layout's vertical balance. */
function LayoutMock({ layout }: { layout: string }) {
  if (layout === "centered") {
    return (
      <div className="cover-mock cover-mock-centered">
        <div className="cover-mock-line cover-mock-line-title" />
        <div className="cover-mock-line cover-mock-line-meta" />
      </div>
    );
  }
  if (layout === "minimal") {
    return (
      <div className="cover-mock cover-mock-minimal">
        <div className="cover-mock-line cover-mock-line-title-thin" />
      </div>
    );
  }
  // classic
  return (
    <div className="cover-mock cover-mock-classic">
      <div className="cover-mock-line cover-mock-line-title" />
      <div className="cover-mock-line cover-mock-line-meta" />
      <div className="cover-mock-line cover-mock-line-foot" />
    </div>
  );
}

