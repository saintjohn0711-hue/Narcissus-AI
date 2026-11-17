import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  /** Max width token — default content */
  width?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  /** Extra classes on the outer wrapper (atmosphere pages) */
  outerClassName?: string;
};

const WIDTH: Record<NonNullable<PageShellProps["width"]>, string> = {
  sm: "max-w-lg",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-none",
};

/**
 * Shared in-app page frame — padding, safe areas, width.
 * Keeps Studio / Muses / Stories / auth pages visually aligned.
 */
export function PageShell({
  children,
  width = "lg",
  className = "",
  outerClassName = "",
}: PageShellProps) {
  return (
    <div
      className={`page-shell ${WIDTH[width]} ${outerClassName} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
