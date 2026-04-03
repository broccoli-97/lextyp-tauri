import { create } from "zustand";

interface AppState {
  sidebarVisible: boolean;
  compiling: boolean;
  lastError: string;
  pdfBase64: string;
  lastDuration: number;
  rawEditMode: boolean;
  capturedSource: string;
  toggleSidebar: () => void;
  setCompiling: (v: boolean) => void;
  setCompilationResult: (pdfBase64: string, duration: number) => void;
  setCompilationError: (error: string, duration: number) => void;
  setRawEditMode: (v: boolean) => void;
  setCapturedSource: (s: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarVisible: false,
  compiling: false,
  lastError: "",
  pdfBase64: "",
  lastDuration: 0,
  rawEditMode: false,
  capturedSource: "",
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setCompiling: (v) => set({ compiling: v }),
  setCompilationResult: (pdfBase64, duration) =>
    set({ pdfBase64, lastDuration: duration, lastError: "", compiling: false }),
  setCompilationError: (error, duration) =>
    set({ lastError: error, lastDuration: duration, compiling: false }),
  setRawEditMode: (v) => set({ rawEditMode: v }),
  setCapturedSource: (s) => set({ capturedSource: s }),
}));
