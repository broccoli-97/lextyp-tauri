import { create } from "zustand";

export interface SourceMapEntry {
  id: string;
  /** Character offset of this marker within the source block (0 = block start). */
  off: number;
  page: number;
  x: number;
  y: number;
}

export interface UpdateInfo {
  has_update: boolean;
  latest_version: string;
  current_version: string;
  release_url: string;
}

interface AppState {
  compiling: boolean;
  lastError: string;
  pdfBase64: string;
  lastDuration: number;
  sourceMap: SourceMapEntry[];
  updateInfo: UpdateInfo | null;
  updateDismissed: boolean;
  setCompiling: (v: boolean) => void;
  setCompilationResult: (pdfBase64: string, duration: number) => void;
  setCompilationError: (error: string, duration: number) => void;
  setSourceMap: (entries: SourceMapEntry[]) => void;
  setUpdateInfo: (info: UpdateInfo) => void;
  dismissUpdate: () => void;
  clear: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  compiling: false,
  lastError: "",
  pdfBase64: "",
  lastDuration: 0,
  sourceMap: [],
  updateInfo: null,
  updateDismissed: false,
  setCompiling: (v) => set({ compiling: v }),
  setCompilationResult: (pdfBase64, duration) =>
    set({ pdfBase64, lastDuration: duration, lastError: "", compiling: false }),
  setCompilationError: (error, duration) =>
    set({ lastError: error, lastDuration: duration, compiling: false }),
  setSourceMap: (sourceMap) => set({ sourceMap }),
  setUpdateInfo: (updateInfo) => set({ updateInfo }),
  dismissUpdate: () => set({ updateDismissed: true }),
  clear: () =>
    set({
      compiling: false,
      lastError: "",
      pdfBase64: "",
      lastDuration: 0,
      sourceMap: [],
    }),
}));
