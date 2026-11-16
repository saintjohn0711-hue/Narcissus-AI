import Link from "next/link";
import { OUTLETS, type OutletId } from "@/lib/outlets";

type OutletStripProps = {
  /** Visual density */
  variant?: "home" | "hub" | "inline";
  /** Highlight active outlet when known */
  active?: OutletId | null;
  className?: string;
};

/**
 * First-class Women / Men / Trans doors — one job, one tap each.
 * Not decorative cards; interaction containers only.
 */
export function OutletStrip({
  variant = "home",
  active = null,
  className = "",
}: OutletStripProps) {
  if (variant === "inline") {
    return (
      <div
        className={`outlet-strip outlet-strip--inline flex flex-wrap gap-2 ${className}`}
        role="navigation"
        aria-label="Outlets"
      >
        {OUTLETS.map((o) => {
          const isActive = active === o.id;
          return (
            <Link
              key={o.id}
              href={o.href}
              className={`outlet-chip ${isActive ? "is-active" : ""}`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    );
  }

  const isHub = variant === "hub";

  return (
    <nav
      className={`outlet-strip outlet-strip--${variant} ${className}`}
      aria-label="Outlets"
    >
      <p className="outlet-strip-kicker">
        {isHub ? "Who do you want" : "Outlets"}
      </p>
      <ul className="outlet-strip-list">
        {OUTLETS.map((o, index) => {
          const isActive = active === o.id;
          return (
            <li key={o.id}>
              <Link
                href={o.href}
                className={`outlet-door group ${isActive ? "is-active" : ""}`}
                style={{ animationDelay: `${0.05 * (index + 1)}s` }}
              >
                <span className="outlet-door-label">{o.label}</span>
                <span className="outlet-door-line">{o.line}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
