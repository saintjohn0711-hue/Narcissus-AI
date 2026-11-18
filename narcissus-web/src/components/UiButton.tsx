import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "primary" | "secondary" | "ghost" | "danger" | "glow";

type Common = {
  tone?: Tone;
  children: ReactNode;
  className?: string;
};

type AsButton = Common &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type AsLink = Common & {
  href: string;
  onClick?: () => void;
};

function toneClass(tone: Tone) {
  switch (tone) {
    case "primary":
      return "ui-btn ui-btn--primary";
    case "glow":
      return "ui-btn ui-btn--glow";
    case "danger":
      return "ui-btn ui-btn--danger";
    case "ghost":
      return "ui-btn ui-btn--ghost";
    default:
      return "ui-btn ui-btn--secondary";
  }
}

/** Shared control — primary / quiet secondary / ghost. Prefer over one-off borders. */
export function UiButton(props: AsButton | AsLink) {
  const { tone = "secondary", children, className = "" } = props;
  const cls = `${toneClass(tone)} ${className}`.trim();

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={cls} onClick={props.onClick}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as AsButton;
  return (
    <button
      type={buttonProps.type ?? "button"}
      className={cls}
      disabled={buttonProps.disabled}
      onClick={buttonProps.onClick}
      aria-pressed={buttonProps["aria-pressed"]}
      aria-expanded={buttonProps["aria-expanded"]}
      aria-controls={buttonProps["aria-controls"]}
      title={buttonProps.title}
      data-testid={buttonProps["data-testid"]}
    >
      {children}
    </button>
  );
}
