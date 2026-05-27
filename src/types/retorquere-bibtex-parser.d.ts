/**
 * Minimal type shim for `@retorquere/bibtex-parser`.
 *
 * The library ships pure JS — it does not include `.d.ts`. We only use
 * `parse()` and a small slice of its option set, so a hand-written shim is
 * lighter than pulling DefinitelyTyped definitions for the upstream's
 * not-yet-typed surface.
 */
declare module "@retorquere/bibtex-parser" {
  interface ParseOptions {
    /** Custom handler for unknown LaTeX macros. Return a string to substitute. */
    unsupported?: (node: unknown, tex: string) => string;
    /** Set false to skip the auto-sentence-case pass on title-mode fields. */
    sentenceCase?: boolean;
    /** Langids that should be treated as English for title casing. `[]` disables. */
    english?: string[] | false;
    /** Bypass post-string normalisation (markup tags, abbreviations). */
    raw?: boolean;
    /** Resolve crossref links automatically (default true). */
    applyCrossRef?: boolean;
    /** Pre-defined @string substitutions. */
    strings?: Record<string, string>;
    /** Treat the `language` field as a langid hint when `langid` is absent. */
    languageAsLangid?: boolean;
  }

  interface ParsedEntry {
    type: string;
    key: string;
    /** Mixed: string for literal fields, structured for creatorlist/literallist. */
    fields: Record<string, unknown>;
    mode?: Record<string, string>;
    input?: string;
  }

  interface ParseResult {
    entries: ParsedEntry[];
    errors: Array<{ error: string; input?: string }>;
    comments: string[];
    strings: Record<string, string>;
    preamble: string[];
  }

  export function parse(input: string, options?: ParseOptions): ParseResult;
}
