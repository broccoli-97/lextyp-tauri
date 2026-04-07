import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type { DocumentMeta, FileTreeEntry } from "../types/workspace";
import { useReferenceStore } from "./reference-store";
import { serializeToTypst } from "../lib/typst-serializer";
import { getFormatter } from "../lib/citation/registry";

interface WorkspaceState {
  // Workspace
  workspacePath: string | null;
  fileTree: FileTreeEntry[];
  expandedFolders: Set<string>;

  // Active document
  activeDocumentPath: string | null;
  activeDocumentMeta: DocumentMeta | null;
  activeDocumentBlocks: any[] | null;
  isDirty: boolean;

  // Editor instance (set by Editor on mount)
  editorInstance: any | null;

  // Actions
  setEditorInstance: (editor: any) => void;
  openWorkspace: (path: string) => Promise<void>;
  refreshFileTree: () => Promise<void>;
  openDocument: (path: string) => Promise<void>;
  saveActiveDocument: () => Promise<void>;
  createDocument: (parentFolder: string, title: string) => Promise<string>;
  createFolder: (parentFolder: string, name: string) => Promise<void>;
  renameItem: (oldPath: string, newPath: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
  toggleFolder: (path: string) => void;
  setDirty: (dirty: boolean) => void;
  closeDocument: () => Promise<void>;
  openFile: () => Promise<void>;
  saveAs: () => Promise<void>;
  exportTypst: () => Promise<void>;
}

const WORKSPACE_KEY = "lextyp_workspace_path";

/** Return the last document path in the flat ordering of the file tree, excluding `excludePath`. */
function findLastDocumentInTree(entries: FileTreeEntry[], excludePath: string | null): string | null {
  let last: string | null = null;
  for (const entry of entries) {
    if (entry.kind === "document" && entry.path !== excludePath) {
      last = entry.path;
    } else if (entry.kind === "folder") {
      const child = findLastDocumentInTree(entry.children, excludePath);
      if (child) last = child;
    }
  }
  return last;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspacePath: null,
  fileTree: [],
  expandedFolders: new Set<string>(),
  activeDocumentPath: null,
  activeDocumentMeta: null,
  activeDocumentBlocks: null,
  isDirty: false,
  editorInstance: null,

  setEditorInstance: (editor) => set({ editorInstance: editor }),

  openWorkspace: async (path) => {
    const tree = await invoke<FileTreeEntry[]>("list_workspace", { path });
    set({ workspacePath: path, fileTree: tree });
    localStorage.setItem(WORKSPACE_KEY, path);
  },

  refreshFileTree: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return;
    const tree = await invoke<FileTreeEntry[]>("list_workspace", {
      path: workspacePath,
    });
    set({ fileTree: tree });
  },

  openDocument: async (path) => {
    const { activeDocumentPath, isDirty } = get();

    // Don't re-open same document
    if (activeDocumentPath === path) return;

    // Auto-save current document if dirty (keep old doc visible during save)
    if (isDirty && activeDocumentPath) {
      await get().saveActiveDocument();
    }

    // Load the new document data BEFORE updating state — old doc stays visible
    const result = await invoke<{
      document_json: string;
      bib_content: string | null;
      meta: DocumentMeta;
    }>("load_project", { path });

    let blocks: any[] = [];
    try {
      blocks = JSON.parse(result.document_json);
    } catch {
      blocks = [];
    }

    // Update reference store
    const refStore = useReferenceStore.getState();
    refStore.clear();
    if (result.bib_content) {
      refStore.setFromRaw(result.bib_content);
    }
    refStore.setCitationStyle(result.meta.citation_style || "oscola");

    // Single atomic update — old doc → new doc, no intermediate null state
    set({
      activeDocumentPath: path,
      activeDocumentMeta: result.meta,
      activeDocumentBlocks: blocks,
      isDirty: false,
    });
  },

  saveActiveDocument: async () => {
    const state = get();
    if (!state.activeDocumentPath || !state.editorInstance) return;
    // Prevent concurrent saves
    if ((get() as any)._saving) return;
    set({ _saving: true } as any);

    try {
      const blocks = state.editorInstance.document;
      const documentJson = JSON.stringify(blocks);

      const refStore = useReferenceStore.getState();
      const formatter = getFormatter(refStore.citationStyle);
      const typstSource = serializeToTypst(blocks, refStore.entries, formatter);

      const now = new Date().toISOString();
      const meta: DocumentMeta = {
        ...(state.activeDocumentMeta || {
          title: "Untitled",
          citation_style: "oscola",
          created_at: now,
          modified_at: now,
        }),
        citation_style: refStore.citationStyle,
        modified_at: now,
      };

      const metaJson = JSON.stringify(meta);
      const bibContent = refStore.rawBibContent || null;

      await invoke("save_project", {
        path: state.activeDocumentPath,
        documentJson,
        typstSource,
        bibContent,
        metaJson,
      });

      // Only update if the same document is still active
      if (get().activeDocumentPath === state.activeDocumentPath) {
        set({ activeDocumentMeta: meta, isDirty: false });
      }
    } finally {
      set({ _saving: false } as any);
    }
  },

  createDocument: async (parentFolder, title) => {
    const safeName = title.replace(/[<>:"/\\|?*]/g, "_").trim() || "Untitled";
    const path = `${parentFolder}/${safeName}.lextyp`;
    const now = new Date().toISOString();

    await invoke("create_document", { path, title, createdAt: now });
    await get().refreshFileTree();
    await get().openDocument(path);
    return path;
  },

  createFolder: async (parentFolder, name) => {
    const safeName = name.replace(/[<>:"/\\|?*]/g, "_").trim() || "New Folder";
    const path = `${parentFolder}/${safeName}`;
    await invoke("create_folder", { path });
    await get().refreshFileTree();

    // Auto-expand the new folder
    set((s) => {
      const next = new Set(s.expandedFolders);
      next.add(path);
      return { expandedFolders: next };
    });
  },

  renameItem: async (oldPath, newPath) => {
    await invoke("rename_item", { oldPath, newPath });

    // If renaming the active document, update the path
    const { activeDocumentPath } = get();
    if (activeDocumentPath === oldPath) {
      set({ activeDocumentPath: newPath });
    }

    await get().refreshFileTree();
  },

  deleteItem: async (path) => {
    await invoke("delete_item", { path });

    // If deleting the active document, close it (will fall back to last in list)
    const { activeDocumentPath } = get();
    if (activeDocumentPath === path) {
      await get().closeDocument();
    } else {
      await get().refreshFileTree();
    }
  },

  toggleFolder: (path) => {
    set((s) => {
      const next = new Set(s.expandedFolders);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedFolders: next };
    });
  },

  setDirty: (dirty) => set({ isDirty: dirty }),

  closeDocument: async () => {
    const { activeDocumentPath, isDirty, fileTree } = get();

    // Auto-save before closing
    if (isDirty && activeDocumentPath) {
      await get().saveActiveDocument();
    }

    // Find the last document in the sidebar list (excluding the one being closed)
    const nextPath = findLastDocumentInTree(fileTree, activeDocumentPath);

    if (nextPath) {
      // Load next document BEFORE clearing state — avoids empty-state flash
      try {
        const result = await invoke<{
          document_json: string;
          bib_content: string | null;
          meta: DocumentMeta;
        }>("load_project", { path: nextPath });

        let blocks: any[] = [];
        try {
          blocks = JSON.parse(result.document_json);
        } catch {
          blocks = [];
        }

        const refStore = useReferenceStore.getState();
        refStore.clear();
        if (result.bib_content) {
          refStore.setFromRaw(result.bib_content);
        }
        refStore.setCitationStyle(result.meta.citation_style || "oscola");

        set({
          activeDocumentPath: nextPath,
          activeDocumentMeta: result.meta,
          activeDocumentBlocks: blocks,
          isDirty: false,
        });
      } catch {
        // If loading fails, fall back to empty state
        useReferenceStore.getState().clear();
        set({
          activeDocumentPath: null,
          activeDocumentMeta: null,
          activeDocumentBlocks: null,
          isDirty: false,
        });
      }
    } else {
      // No other document — go to empty state
      useReferenceStore.getState().clear();
      set({
        activeDocumentPath: null,
        activeDocumentMeta: null,
        activeDocumentBlocks: null,
        isDirty: false,
      });
    }

    // Refresh file tree after state is settled
    await get().refreshFileTree();
  },

  openFile: async () => {
    const selected = await openDialog({
      filters: [{ name: "LexTyp Document", extensions: ["lextyp"] }],
    });
    if (!selected) return;
    await get().openDocument(selected as string);
  },

  saveAs: async () => {
    const { editorInstance, activeDocumentMeta } = get();
    if (!editorInstance) return;

    const defaultName = (activeDocumentMeta?.title || "Untitled") + ".lextyp";
    const dest = await saveDialog({
      filters: [{ name: "LexTyp Document", extensions: ["lextyp"] }],
      defaultPath: defaultName,
    });
    if (!dest) return;

    const blocks = editorInstance.document;
    const documentJson = JSON.stringify(blocks);

    const refStore = useReferenceStore.getState();
    const formatter = getFormatter(refStore.citationStyle);
    const typstSource = serializeToTypst(blocks, refStore.entries, formatter);

    const now = new Date().toISOString();
    const title = dest
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.replace(/\.lextyp$/, "") || "Untitled";
    const meta: DocumentMeta = {
      title,
      citation_style: refStore.citationStyle,
      created_at: activeDocumentMeta?.created_at || now,
      modified_at: now,
    };

    await invoke("save_project", {
      path: dest,
      documentJson,
      typstSource,
      bibContent: refStore.rawBibContent || null,
      metaJson: JSON.stringify(meta),
    });

    // Update active path to the new location
    set({ activeDocumentPath: dest, activeDocumentMeta: meta, isDirty: false });
    await get().refreshFileTree();
  },

  exportTypst: async () => {
    const { editorInstance, activeDocumentMeta } = get();
    if (!editorInstance) return;

    const defaultName = (activeDocumentMeta?.title || "document") + ".typ";
    const dest = await saveDialog({
      filters: [{ name: "Typst Source", extensions: ["typ"] }],
      defaultPath: defaultName,
    });
    if (!dest) return;

    const blocks = editorInstance.document;
    const refStore = useReferenceStore.getState();
    const formatter = getFormatter(refStore.citationStyle);
    const typstSource = serializeToTypst(blocks, refStore.entries, formatter);

    const encoder = new TextEncoder();
    await writeFile(dest, encoder.encode(typstSource));
  },
}));

// Restore workspace on module load
const savedPath = localStorage.getItem(WORKSPACE_KEY);
if (savedPath) {
  useWorkspaceStore.getState().openWorkspace(savedPath).catch(console.error);
}
