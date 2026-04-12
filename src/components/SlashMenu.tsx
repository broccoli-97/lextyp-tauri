import type {
  DefaultReactSuggestionItem,
  SuggestionMenuProps,
} from "@blocknote/react";
import { useLayoutEffect, useRef } from "react";

export function SlashMenu({
  items,
  loadingState,
  selectedIndex,
  onItemClick,
}: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    if (selectedIndex === undefined) {
      return;
    }

    const container = containerRef.current;
    const item = itemRefs.current[selectedIndex];
    if (!container || !item) {
      return;
    }

    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (itemTop < viewTop) {
      container.scrollTop = itemTop;
      return;
    }

    if (itemBottom > viewBottom) {
      container.scrollTop = itemBottom - container.clientHeight;
    }
  }, [selectedIndex, items]);

  let currentGroup: string | undefined;

  return (
    <div
      id="bn-suggestion-menu"
      ref={containerRef}
      role="listbox"
      className="slash-menu"
    >
      {items.map((item, index) => {
        const groupLabel =
          item.group !== currentGroup ? (
            <div key={`group-${item.group}`} className="slash-menu-group">
              {item.group}
            </div>
          ) : null;

        currentGroup = item.group;

        return (
          <div key={`${item.group}-${item.title}`}>
            {groupLabel}
            <button
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              id={`bn-suggestion-menu-item-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedIndex || undefined}
              data-selected={index === selectedIndex ? "true" : undefined}
              className="slash-menu-item"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onItemClick?.(item)}
            >
              <div className="slash-menu-item-title">{item.title}</div>
              {item.subtext && (
                <div className="slash-menu-item-subtext">{item.subtext}</div>
              )}
            </button>
          </div>
        );
      })}

      {items.length === 0 &&
        (loadingState === "loading" || loadingState === "loaded") && (
          <div className="slash-menu-empty">No matching items</div>
        )}
    </div>
  );
}
