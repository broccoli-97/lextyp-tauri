/**
 * Bumped whenever the on-disk shape of `.lextyp` changes in a way the older
 * load path can't read transparently. Must match `CURRENT_SCHEMA_VERSION` in
 * `src-tauri/src/project.rs` — the Rust side is the source of truth and will
 * migrate older files in memory on load.
 */
export const CURRENT_SCHEMA_VERSION = 1;

export interface DocumentMeta {
  schema_version: number;
  title: string;
  citation_style: string;
  created_at: string;
  modified_at: string;
}

export interface FileTreeFolder {
  kind: "folder";
  name: string;
  path: string;
  children: FileTreeEntry[];
}

export interface FileTreeDocument {
  kind: "document";
  name: string;
  path: string;
  title: string;
  modified_at: string;
}

export type FileTreeEntry = FileTreeFolder | FileTreeDocument;
