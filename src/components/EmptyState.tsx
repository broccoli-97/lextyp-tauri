import type { ReactNode } from "react";

/**
 * Shared empty-state shell. Three places in the app show "nothing here
 * yet" prompts (no workspace, no document, no PDF) and they previously
 * each rolled their own dashed-border boxes at different sizes, fonts,
 * and button treatments. This component standardises the visual scale
 * so they read as the same kind of moment, even when the content
 * differs.
 *
 * The icon prop receives the icon node (sized however the caller likes,
 * but 22 px works best inside the 56 px container). The CTA is optional
 * — leave it out for purely informative states.
 */
export function EmptyState({
  icon,
  title,
  description,
  cta,
  className = "",
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  cta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center gap-3 px-6 ${className}`}
    >
      <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)]">
        {icon}
      </div>
      <div className="text-center max-w-[240px]">
        <p className="text-[13px] font-medium text-[var(--text-primary)]">
          {title}
        </p>
        {description && (
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
