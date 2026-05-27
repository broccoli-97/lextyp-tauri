import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";

/**
 * Imperative surface the Editor publishes for sibling components (Sidebar,
 * PdfPreview, CoverPageCard, …) to call into. These are *commands*, not
 * state, so a context-carrying ref is the right vehicle: consumers don't need
 * to re-render when the editor mounts/unmounts, they just want to fire the
 * call when the user clicks.
 *
 * Replaces the previous `window.__lextyp_*` global stash, which:
 *   • short-circuited React's data flow,
 *   • would have broken any multi-window future (one window stomps the other),
 *   • didn't get cleaned up under Strict Mode's double-mount,
 *   • was invisible to TypeScript,
 *   • made the Editor untestable in isolation.
 */
export interface EditorBridgeApi {
  insertCitation: (key: string) => void;
  openCitationPicker: () => void;
  openDocumentPicker: () => void;
  openCoverPageDialog: (block: unknown) => void;
  jumpToBlock: (blockId: string, charOffset?: number) => void;
}

interface BridgeContextValue {
  ref: MutableRefObject<EditorBridgeApi | null>;
}

const EditorBridgeContext = createContext<BridgeContextValue | null>(null);

export function EditorBridgeProvider({ children }: { children: ReactNode }) {
  const ref = useRef<EditorBridgeApi | null>(null);
  const value = useMemo<BridgeContextValue>(() => ({ ref }), []);
  return (
    <EditorBridgeContext.Provider value={value}>
      {children}
    </EditorBridgeContext.Provider>
  );
}

function useBridgeRef(): MutableRefObject<EditorBridgeApi | null> {
  const ctx = useContext(EditorBridgeContext);
  if (!ctx) {
    throw new Error("EditorBridge consumer used outside EditorBridgeProvider");
  }
  return ctx.ref;
}

/**
 * Producer hook for the Editor. Returns a setter that publishes a fresh
 * bridge object, and clears it on unmount. The handlers themselves are
 * unstable references — the latest snapshot is always what gets called.
 */
export function usePublishEditorBridge(): (api: EditorBridgeApi | null) => void {
  const ref = useBridgeRef();
  return useCallback(
    (api) => {
      ref.current = api;
    },
    [ref]
  );
}

/**
 * Consumer hook. Returns stable callback wrappers so the consumer can pass
 * them down through props without invalidating memoisation every render. If
 * no editor is currently mounted, calls are silently dropped — the same
 * behaviour the window-global version had when the Editor wasn't there.
 */
export function useEditorBridge(): EditorBridgeApi {
  const ref = useBridgeRef();
  return useMemo<EditorBridgeApi>(
    () => ({
      insertCitation: (key) => ref.current?.insertCitation(key),
      openCitationPicker: () => ref.current?.openCitationPicker(),
      openDocumentPicker: () => ref.current?.openDocumentPicker(),
      openCoverPageDialog: (block) => ref.current?.openCoverPageDialog(block),
      jumpToBlock: (id, off) => ref.current?.jumpToBlock(id, off),
    }),
    [ref]
  );
}
