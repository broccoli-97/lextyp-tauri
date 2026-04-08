import { create } from "zustand";

interface AppState {
  compiling: boolean;
  lastError: string;
  pdfBase64: string;
  lastDuration: number;
  setCompiling: (v: boolean) => void;
  setCompilationResult: (pdfBase64: string, duration: number) => void;
  setCompilationError: (error: string, duration: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  compiling: false,
  lastError: "",
  pdfBase64: "",
  lastDuration: 0,
  setCompiling: (v) => set({ compiling: v }),
  setCompilationResult: (pdfBase64, duration) =>
    set({ pdfBase64, lastDuration: duration, lastError: "", compiling: false }),
  setCompilationError: (error, duration) =>
    set({ lastError: error, lastDuration: duration, compiling: false }),
}));
