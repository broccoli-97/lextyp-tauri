import { useState, useCallback, useMemo } from "react";
import { X, Code, FormInput, AlertCircle } from "lucide-react";
import { parseBibtex } from "../lib/bib-parser";
import { useT } from "../lib/i18n";
import type { BibEntry } from "../types/bib";

/** Standard BibTeX entry types with their required and optional fields. */
const ENTRY_TYPES: Record<string, { required: string[]; optional: string[] }> = {
  article: {
    required: ["author", "title", "journal", "year"],
    optional: ["volume", "number", "pages", "doi", "url"],
  },
  book: {
    required: ["author", "title", "publisher", "year"],
    optional: ["editor", "volume", "series", "edition", "url", "doi"],
  },
  inproceedings: {
    required: ["author", "title", "booktitle", "year"],
    optional: ["editor", "pages", "publisher", "doi", "url"],
  },
  incollection: {
    required: ["author", "title", "booktitle", "publisher", "year"],
    optional: ["editor", "pages", "doi", "url"],
  },
  phdthesis: {
    required: ["author", "title", "school", "year"],
    optional: ["url"],
  },
  mastersthesis: {
    required: ["author", "title", "school", "year"],
    optional: ["url"],
  },
  techreport: {
    required: ["author", "title", "institution", "year"],
    optional: ["number", "url"],
  },
  misc: {
    required: ["title"],
    optional: ["author", "year", "howpublished", "url", "note"],
  },
  online: {
    required: ["title", "url"],
    optional: ["author", "year", "urldate", "note"],
  },
  case: {
    required: ["title", "year"],
    optional: ["court", "number", "url"],
  },
};

const ENTRY_TYPE_NAMES = Object.keys(ENTRY_TYPES);

interface CitationEditorProps {
  /** If provided, editing an existing entry. */
  editEntry?: BibEntry | null;
  existingKeys: string[];
  onSave: (entry: BibEntry) => void;
  onCancel: () => void;
}

export function CitationEditor({ editEntry, existingKeys, onSave, onCancel }: CitationEditorProps) {
  const t = useT();
  const isEditing = !!editEntry;
  const [mode, setMode] = useState<"form" | "bibtex">(isEditing ? "form" : "form");
  const [error, setError] = useState<string | null>(null);

  // --- BibTeX mode state ---
  const [bibText, setBibText] = useState(() => {
    if (editEntry) {
      return entryToBibtexStr(editEntry);
    }
    return "";
  });

  // --- Form mode state ---
  const [entryType, setEntryType] = useState(editEntry?.type || "article");
  const [citationKey, setCitationKey] = useState(editEntry?.key || "");
  const [fields, setFields] = useState<Record<string, string>>(() => {
    if (editEntry) return { ...editEntry.fields };
    return {};
  });

  const typeDef = useMemo(() => ENTRY_TYPES[entryType] || ENTRY_TYPES.misc, [entryType]);
  const allFields = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const f of typeDef.required) { seen.add(f); result.push(f); }
    for (const f of typeDef.optional) { seen.add(f); result.push(f); }
    // Include any extra fields from the existing entry
    if (editEntry) {
      for (const f of Object.keys(editEntry.fields)) {
        if (!seen.has(f)) { seen.add(f); result.push(f); }
      }
    }
    return result;
  }, [typeDef, editEntry]);

  const setField = useCallback((key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveForm = useCallback(() => {
    setError(null);
    const key = citationKey.trim();
    if (!key) {
      setError(t("refs.errorKeyRequired"));
      return;
    }
    if (!/^[\w][\w:./-]*$/.test(key)) {
      setError(t("refs.errorKeyInvalid"));
      return;
    }
    if (!isEditing && existingKeys.includes(key)) {
      setError(t("refs.errorKeyDuplicate"));
      return;
    }
    // Check required fields
    for (const req of typeDef.required) {
      if (!fields[req]?.trim()) {
        setError(`${t("refs.errorFieldRequired")}: ${req}`);
        return;
      }
    }
    const cleanFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v.trim()) cleanFields[k] = v.trim();
    }
    onSave({ key, type: entryType, fields: cleanFields });
  }, [citationKey, entryType, fields, typeDef, isEditing, existingKeys, onSave, t]);

  const handleSaveBibtex = useCallback(() => {
    setError(null);
    const text = bibText.trim();
    if (!text) {
      setError(t("refs.errorBibEmpty"));
      return;
    }
    const parsed = parseBibtex(text);
    if (parsed.length === 0) {
      setError(t("refs.errorBibParseFail"));
      return;
    }
    const entry = parsed[0];
    if (!entry.key || !entry.type) {
      setError(t("refs.errorBibParseFail"));
      return;
    }
    if (!isEditing && existingKeys.includes(entry.key)) {
      setError(t("refs.errorKeyDuplicate"));
      return;
    }
    onSave(entry);
  }, [bibText, isEditing, existingKeys, onSave, t]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-light)] shrink-0">
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
          {isEditing ? t("refs.editRef") : t("refs.newRef")}
        </span>
        <button onClick={onCancel} className="icon-btn w-6 h-6">
          <X size={14} />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 px-3 pt-2 pb-1 shrink-0">
        <button
          onClick={() => setMode("form")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
            mode === "form"
              ? "bg-[var(--accent-light)] text-[var(--accent)] ring-1 ring-[var(--accent)]"
              : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          <FormInput size={12} />
          {t("refs.modeForm")}
        </button>
        <button
          onClick={() => setMode("bibtex")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
            mode === "bibtex"
              ? "bg-[var(--accent-light)] text-[var(--accent)] ring-1 ring-[var(--accent)]"
              : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
        >
          <Code size={12} />
          BibTeX
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-1 flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--error-light)] text-[var(--error)] text-[11px] shrink-0">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-3 min-h-0">
        {mode === "bibtex" ? (
          <div className="flex flex-col gap-2 h-full">
            <textarea
              value={bibText}
              onChange={(e) => setBibText(e.target.value)}
              placeholder={`@article{smith2023,\n  author = {John Smith},\n  title = {Example Title},\n  journal = {Journal Name},\n  year = {2023}\n}`}
              spellCheck={false}
              className="flex-1 min-h-[120px] w-full px-2.5 py-2 text-[11px] font-mono leading-[1.6] bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] resize-none focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Entry type */}
            <FormField label={t("refs.fieldType")} required>
              <select
                value={entryType}
                onChange={(e) => {
                  setEntryType(e.target.value);
                  setFields({});
                }}
                className="input h-7 text-[11px] px-2 bg-[var(--bg-primary)]"
              >
                {ENTRY_TYPE_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Citation key */}
            <FormField label={t("refs.fieldKey")} required>
              <input
                type="text"
                value={citationKey}
                onChange={(e) => setCitationKey(e.target.value)}
                placeholder="smith2023"
                disabled={isEditing}
                className="input h-7 text-[11px] px-2"
              />
            </FormField>

            {/* Dynamic fields */}
            {allFields.map((fieldName) => (
              <FormField
                key={fieldName}
                label={fieldName}
                required={typeDef.required.includes(fieldName)}
              >
                <input
                  type="text"
                  value={fields[fieldName] || ""}
                  onChange={(e) => setField(fieldName, e.target.value)}
                  className="input h-7 text-[11px] px-2"
                />
              </FormField>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-2 border-t border-[var(--border-light)] flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 btn btn-secondary h-8 text-[11px]"
        >
          {t("refs.cancel")}
        </button>
        <button
          onClick={mode === "bibtex" ? handleSaveBibtex : handleSaveForm}
          className="flex-1 btn btn-primary h-8 text-[11px]"
        >
          {isEditing ? t("refs.save") : t("refs.create")}
        </button>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-[0.06em] mb-0.5 px-0.5">
        {label}
        {required && <span className="text-[var(--error)]">*</span>}
      </label>
      {children}
    </div>
  );
}

function entryToBibtexStr(entry: BibEntry): string {
  const fields = Object.entries(entry.fields)
    .filter(([, v]) => v.trim() !== "")
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(",\n");
  return `@${entry.type}{${entry.key},\n${fields}\n}`;
}
