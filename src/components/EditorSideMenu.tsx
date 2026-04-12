import { useEffect, useRef } from "react";
import { AddBlockButton, SideMenu, useComponentsContext, useExtension, useExtensionState } from "@blocknote/react";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { GripVertical } from "lucide-react";

function makeDragPreview(text: string) {
  const ghost = document.createElement("div");
  ghost.textContent = text;
  ghost.style.position = "fixed";
  ghost.style.left = "-9999px";
  ghost.style.top = "0";
  ghost.style.padding = "8px 12px";
  ghost.style.borderRadius = "10px";
  ghost.style.border = "1px solid var(--border)";
  ghost.style.background = "var(--bg-elevated)";
  ghost.style.color = "var(--text-primary)";
  ghost.style.boxShadow = "var(--shadow-lg)";
  ghost.style.fontFamily = "var(--font-ui)";
  ghost.style.fontSize = "12px";
  ghost.style.fontWeight = "500";
  ghost.style.maxWidth = "260px";
  ghost.style.overflow = "hidden";
  ghost.style.textOverflow = "ellipsis";
  ghost.style.whiteSpace = "nowrap";
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "99999";
  document.body.appendChild(ghost);
  return ghost;
}

function getBlockPreviewText(blockId: string, blockType: string) {
  const blockEl = document.querySelector<HTMLElement>(`[data-id="${blockId}"]`);
  const text = blockEl?.textContent?.replace(/\s+/g, " ").trim();
  if (text) {
    return text.slice(0, 60);
  }

  switch (blockType) {
    case "heading":
      return "Heading";
    case "bulletListItem":
      return "Bullet list item";
    case "numberedListItem":
      return "Numbered list item";
    default:
      return "Block";
  }
}

function DragBlockButton() {
  const Components = useComponentsContext()!;
  const sideMenu = useExtension(SideMenuExtension);
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });
  const dragPreviewRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      dragPreviewRef.current?.remove();
      dragPreviewRef.current = null;
    };
  }, []);

  if (!block) {
    return null;
  }

  return (
    <Components.SideMenu.Button
      className="bn-button"
      label="Drag block"
      draggable={true}
      onDragStart={(event) => {
        sideMenu.blockDragStart(event, block);

        if (!event.dataTransfer) {
          return;
        }

        dragPreviewRef.current?.remove();
        const ghost = makeDragPreview(getBlockPreviewText(block.id, block.type));
        dragPreviewRef.current = ghost;

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setDragImage(ghost, 12, 12);
      }}
      onDragEnd={() => {
        dragPreviewRef.current?.remove();
        dragPreviewRef.current = null;
        sideMenu.blockDragEnd();
      }}
      icon={<GripVertical size={18} data-test="dragHandle" />}
    />
  );
}

export function EditorSideMenu() {
  return (
    <SideMenu>
      <AddBlockButton />
      <DragBlockButton />
    </SideMenu>
  );
}
