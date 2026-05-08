import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type { DocumentMeta, FileTreeEntry } from "../types/workspace";
import { useReferenceStore } from "./reference-store";
import { useAppStore } from "./app-store";
import { serializeToTypst, type IncludeResolver } from "../lib/typst-serializer";
import { getFormatter } from "../lib/citation/registry";
import { parseBibtex } from "../lib/bib-parser";
import { t } from "../lib/i18n";
import { formatAutoDate } from "../lib/date-format";
import { useSettingsStore } from "./settings-store";
import type { ProjectTemplate } from "../lib/templates";

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
  closeWorkspace: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
  openDocument: (path: string) => Promise<void>;
  saveActiveDocument: () => Promise<void>;
  createDocument: (parentFolder: string, title: string) => Promise<string>;
  createDocumentFromTemplate: (parentFolder: string, template: ProjectTemplate) => Promise<string>;
  createFolder: (parentFolder: string, name: string) => Promise<void>;
  renameItem: (oldPath: string, newPath: string) => Promise<void>;
  moveItem: (sourcePath: string, targetFolderPath: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
  toggleFolder: (path: string) => void;
  setDirty: (dirty: boolean) => void;
  closeDocument: () => Promise<void>;
  openFile: () => Promise<void>;
  saveAs: () => Promise<void>;
  exportTypst: () => Promise<void>;
}

const WORKSPACE_KEY = "lextyp_workspace_path";
const ACTIVE_DOC_KEY = "lextyp_active_document_path";

/**
 * Build a resolver that loads an included `.lextyp` document's blocks and
 * bibliography. Shared by the workspace store (save/export) and the editor
 * (live compile) so both paths inline child documents consistently.
 */
export function makeIncludeResolver(): IncludeResolver {
  return async (path) => {
    const result = await invoke<{
      document_json: string;
      bib_content: string | null;
      meta: DocumentMeta;
    }>("load_project", { path });

    let blocks: any[] = [];
    try {
      blocks = JSON.parse(result.document_json || "[]");
    } catch {
      blocks = [];
    }
    const entries = result.bib_content ? parseBibtex(result.bib_content) : [];
    return {
      blocks,
      entries,
      citationStyle: result.meta?.citation_style || "oscola",
    };
  };
}

/** Serialize the current editor document to Typst source. */
async function buildTypstSource(editorInstance: any): Promise<string> {
  const blocks = editorInstance.document;
  const refStore = useReferenceStore.getState();
  const formatter = getFormatter(refStore.citationStyle);
  return serializeToTypst(
    blocks,
    refStore.entries,
    formatter,
    false,
    makeIncludeResolver(),
    t("doc.references"),
    formatAutoDate(useSettingsStore.getState().locale)
  );
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

  closeWorkspace: async () => {
    // Close active document first (auto-saves if dirty)
    if (get().activeDocumentPath) {
      await get().closeDocument();
    }
    set({
      workspacePath: null,
      fileTree: [],
      expandedFolders: new Set<string>(),
    });
    localStorage.removeItem(WORKSPACE_KEY);
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
    localStorage.setItem(ACTIVE_DOC_KEY, path);
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
      const typstSource = await buildTypstSource(state.editorInstance);

      const refStore = useReferenceStore.getState();
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

  /**
   * Materialize a bundled `ProjectTemplate` into a real `.lextyp` archive in
   * the user's workspace, then open it. We construct the project entirely in
   * memory (blocks JSON, Typst source, bib, metadata) and call `save_project`
   * directly — this matches what the auto-save pipeline writes after a normal
   * edit, so the resulting file is a regular document the user can rename,
   * delete, or treat as their own from the moment it appears in the tree.
   *
   * The destination filename is auto-numbered if it collides with an existing
   * file, so users can click the "open example" action repeatedly and get a
   * clean copy each time without overwriting their edits.
   */
  createDocumentFromTemplate: async (parentFolder, template) => {
    const baseName =
      template.defaultTitle.replace(/[<>:"/\\|?*]/g, "_").trim() || "Untitled";

    // Walk the file tree to pick a non-colliding name.
    const existingPaths = (() => {
      const flat: string[] = [];
      const visit = (entries: FileTreeEntry[]) => {
        for (const e of entries) {
          flat.push(e.path);
          if (e.kind === "folder") visit(e.children);
        }
      };
      visit(get().fileTree);
      // Normalize separators so the comparison works on Windows too.
      return new Set(flat.map((p) => p.replace(/\\/g, "/")));
    })();

    let title = baseName;
    let path = `${parentFolder}/${title}.lextyp`;
    let n = 1;
    while (existingPaths.has(path.replace(/\\/g, "/"))) {
      n += 1;
      title = `${baseName} (${n})`;
      path = `${parentFolder}/${title}.lextyp`;
    }

    const now = new Date().toISOString();
    const meta: DocumentMeta = {
      title,
      citation_style: template.citationStyle,
      created_at: now,
      modified_at: now,
    };

    const entries = template.bibContent ? parseBibtex(template.bibContent) : [];
    const formatter = getFormatter(template.citationStyle);
    const typstSource = await serializeToTypst(
      template.blocks,
      entries,
      formatter,
      false,
      makeIncludeResolver(),
      t("doc.references"),
      formatAutoDate(useSettingsStore.getState().locale)
    );

    await invoke("save_project", {
      path,
      documentJson: JSON.stringify(template.blocks),
      typstSource,
      bibContent: template.bibContent || null,
      metaJson: JSON.stringify(meta),
    });

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
      localStorage.setItem(ACTIVE_DOC_KEY, newPath);
    }

    await get().refreshFileTree();
  },

  moveItem: async (sourcePath, targetFolderPath) => {
    // Extract the file/folder name from the source path
    const name = sourcePath.replace(/\\/g, "/").split("/").pop();
    if (!name) return;
    const newPath = `${targetFolderPath}/${name}`;

    // Don't move to the same location
    if (newPath === sourcePath) return;

    await invoke("rename_item", { oldPath: sourcePath, newPath });

    // If moving the active document, update the path
    const { activeDocumentPath } = get();
    if (activeDocumentPath === sourcePath) {
      set({ activeDocumentPath: newPath });
      localStorage.setItem(ACTIVE_DOC_KEY, newPath);
    }

    await get().refreshFileTree();
  },

  deleteItem: async (path) => {
    await invoke("delete_item", { path });

    // If deleting the active document, close it
    const { activeDocumentPath } = get();
    if (activeDocumentPath === path) {
      await get().closeDocument();
    }

    await get().refreshFileTree();
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
    const { activeDocumentPath, isDirty } = get();

    // Auto-save before closing
    if (isDirty && activeDocumentPath) {
      try {
        await get().saveActiveDocument();
      } catch (err) {
        console.error("Auto-save before close failed:", err);
      }
    }

    // Clear PDF data first so react-pdf can cleanly release its resources
    // before PdfPreview is unmounted (avoids double-free in the webview).
    useAppStore.getState().clear();

    // Wait a frame for react-pdf to process the empty state before we
    // unmount the component by clearing activeDocumentPath.
    await new Promise((r) => requestAnimationFrame(r));

    useReferenceStore.getState().clear();
    set({
      activeDocumentPath: null,
      activeDocumentMeta: null,
      activeDocumentBlocks: null,
      isDirty: false,
    });
    localStorage.removeItem(ACTIVE_DOC_KEY);
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
    const typstSource = await buildTypstSource(editorInstance);

    const refStore = useReferenceStore.getState();
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
    localStorage.setItem(ACTIVE_DOC_KEY, dest);
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

    const typstSource = await buildTypstSource(editorInstance);

    const encoder = new TextEncoder();
    await writeFile(dest, encoder.encode(typstSource));
  },
}));

// Restore workspace and active document on module load
const savedPath = localStorage.getItem(WORKSPACE_KEY);
if (savedPath) {
  useWorkspaceStore
    .getState()
    .openWorkspace(savedPath)
    .then(() => {
      const savedDoc = localStorage.getItem(ACTIVE_DOC_KEY);
      if (savedDoc) {
        return useWorkspaceStore.getState().openDocument(savedDoc);
      }
    })
    .catch(console.error);
}
