export interface DocumentMeta {
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
