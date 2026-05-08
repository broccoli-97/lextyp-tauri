/**
 * A bundled starter template — a complete document the user can open as a
 * read-and-edit tutorial. Loaded via `createDocumentFromTemplate` in the
 * workspace store, which writes a fresh `.lextyp` to the workspace and
 * opens it like any other document.
 */
export interface ProjectTemplate {
  /** Stable identifier (filename-safe). Used for analytics / debug only. */
  id: string;
  /** Default file name (without extension). The store de-dupes against
   *  existing files in the target folder by appending " (n)". */
  defaultTitle: string;
  /** Initial citation style. Must match a key in citation/registry.ts. */
  citationStyle: string;
  /** Optional raw `.bib` content; entries the template's citations refer to. */
  bibContent: string | null;
  /** BlockNote document blocks. IDs may be omitted — BlockNote regenerates
   *  them on load. Custom block types (coverPage, tableOfContents, etc.)
   *  must already be registered in `editor/schema.tsx`. */
  blocks: any[];
}
