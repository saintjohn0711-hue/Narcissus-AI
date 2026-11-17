import type { ReactNode } from "react";

type PageHeaderProps = {
  kicker?: string;
  /** muted (default) or glow for outlet / power surfaces */
  kickerTone?: "muted" | "glow";
  title: string;
  lede?: ReactNode;
  /** Primary / secondary actions — keep secondary quiet via ui-btn--ghost */
  actions?: ReactNode;
  /** Tighter stack for dense list pages */
  dense?: boolean;
  className?: string;
};

/**
 * Shared page title block — one kicker, one title, one lede, optional actions.
 */
export function PageHeader({
  kicker,
  kickerTone = "muted",
  title,
  lede,
  actions,
  dense = false,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`page-header ${dense ? "page-header--dense" : ""} ${className}`.trim()}
    >
      <div className="page-header-copy min-w-0 flex-1">
        {kicker ? (
          <p
            className={`page-kicker${kickerTone === "glow" ? " page-kicker--glow" : ""}`}
          >
            {kicker}
          </p>
        ) : null}
        <h1 className="page-title">{title}</h1>
        {lede ? <div className="page-lede">{lede}</div> : null}
      </div>
      {actions ? (
        <div className="page-header-actions flex flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
