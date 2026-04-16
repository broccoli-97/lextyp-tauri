import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { VersionSnapshot, VersionIndex } from "../types/version";
import type { DiffEntry } from "../lib/block-diff";

interface VersionState {
  versions: VersionSnapshot[];
  loading: boolean;

  // Viewing a historical version (read-only)
  viewingVersionId: number | null;
  viewingVersionBlocks: any[] | null;
  viewingVersionName: string | null;

  // Diff mode
  diffMode: boolean;
  diffBaseId: number | null;
  diffTargetId: number | null;
  diffResult: DiffEntry[] | null;

  // Actions
  loadIndex: (path: string) => Promise<void>;
  saveVersion: (
    path: string,
    name: string,
    description: string,
    author: string,
    documentJson: string,
    metaJson: string
  ) => Promise<VersionSnapshot>;
  viewVersion: (path: string, id: number) => Promise<void>;
  exitVersionView: () => void;
  deleteVersion: (path: string, id: number) => Promise<void>;
  startDiff: (path: string, baseId: number, targetId: number) => Promise<void>;
  exitDiff: () => void;
  clear: () => void;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  loading: false,
  viewingVersionId: null,
  viewingVersionBlocks: null,
  viewingVersionName: null,
  diffMode: false,
  diffBaseId: null,
  diffTargetId: null,
  diffResult: null,

  loadIndex: async (path) => {
    set({ loading: true });
    try {
      const result = await invoke<VersionIndex | null>("load_version_index", {
        path,
      });
      set({ versions: result?.versions ?? [] });
    } catch {
      set({ versions: [] });
    } finally {
      set({ loading: false });
    }
  },

  saveVersion: async (path, name, description, author, documentJson, metaJson) => {
    const snapshot = await invoke<VersionSnapshot>("save_version", {
      path,
      name,
      description,
      author,
      documentJson,
      metaJson,
    });
    // Refresh index
    await get().loadIndex(path);
    return snapshot;
  },

  viewVersion: async (path, id) => {
    set({ loading: true });
    try {
      const dataStr = await invoke<string>("load_version", {
        path,
        versionId: id,
      });
      const data = JSON.parse(dataStr);
      const blocks = JSON.parse(data.document_json);
      const versionMeta = get().versions.find((v) => v.id === id);
      set({
        viewingVersionId: id,
        viewingVersionBlocks: blocks,
        viewingVersionName: versionMeta?.name ?? `Version ${id}`,
      });
    } finally {
      set({ loading: false });
    }
  },

  exitVersionView: () =>
    set({
      viewingVersionId: null,
      viewingVersionBlocks: null,
      viewingVersionName: null,
    }),

  deleteVersion: async (path, id) => {
    await invoke("delete_version", { path, versionId: id });
    await get().loadIndex(path);
  },

  startDiff: async (path, baseId, targetId) => {
    set({ loading: true });
    try {
      const [baseStr, targetStr] = await Promise.all([
        invoke<string>("load_version", { path, versionId: baseId }),
        invoke<string>("load_version", { path, versionId: targetId }),
      ]);
      const baseData = JSON.parse(baseStr);
      const targetData = JSON.parse(targetStr);
      const baseBlocks = JSON.parse(baseData.document_json);
      const targetBlocks = JSON.parse(targetData.document_json);

      // Lazy-load diff to keep bundle small
      const { computeBlockDiff } = await import("../lib/block-diff");
      const diffResult = computeBlockDiff(baseBlocks, targetBlocks);

      set({
        diffMode: true,
        diffBaseId: baseId,
        diffTargetId: targetId,
        diffResult,
      });
    } finally {
      set({ loading: false });
    }
  },

  exitDiff: () =>
    set({
      diffMode: false,
      diffBaseId: null,
      diffTargetId: null,
      diffResult: null,
    }),

  clear: () =>
    set({
      versions: [],
      loading: false,
      viewingVersionId: null,
      viewingVersionBlocks: null,
      viewingVersionName: null,
      diffMode: false,
      diffBaseId: null,
      diffTargetId: null,
      diffResult: null,
    }),
}));
