export interface VersionSnapshot {
  id: number;
  name: string;
  description: string;
  author: string;
  created_at: string;
  block_count: number;
}

export interface VersionIndex {
  versions: VersionSnapshot[];
  max_versions: number;
}
