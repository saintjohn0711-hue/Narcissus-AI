"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Cancel / dismiss label */
  cancelLabel?: string;
  /** Confirm action label */
  confirmLabel?: string;
  /** Danger styling for destructive confirms */
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Optional test id root */
  testId?: string;
};

/**
 * Branded modal confirm — Escape / Cancel / backdrop abort; Confirm runs the action.
 * Matches PartnerCard lightbox dialog chrome (navy / rose gold / electric blue).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  danger = false,
  onCancel,
  onConfirm,
  testId = "confirm-dialog",
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Prefer focusing Cancel so Enter does not accidentally destroy.
    cancelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className="confirm-dialog partner-lightbox fixed inset-0 z-[60] flex items-center justify-center bg-[#050403]/88 px-4 py-8 backdrop-blur-[2px]"
      data-testid={testId}
      onClick={onCancel}
    >
      <div
        className="confirm-dialog-panel w-full max-w-md border border-[var(--accent)]/40 bg-[var(--bg-elevated)] p-5 shadow-[0_0_40px_rgba(0,163,255,0.08)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
        data-testid={`${testId}-panel`}
      >
        <h2
          id={titleId}
          className="text-xl text-[var(--ink)] sm:text-2xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title}
        </h2>
        {description != null && description !== "" && (
          <div
            id={descId}
            className="mt-2 text-sm leading-relaxed text-[#c4b7a8]"
          >
            {description}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="ui-btn ui-btn--secondary"
            data-testid={`${testId}-cancel`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger ? "ui-btn ui-btn--danger" : "ui-btn ui-btn--primary"
            }
            data-testid={`${testId}-confirm`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
