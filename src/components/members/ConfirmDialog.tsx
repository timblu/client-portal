"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirmDisabled = false,
  checkbox,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  checkbox?: {
    id: string;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!dialog.open) dialog.showModal();
      cancelRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  function returnFocus() {
    openerRef.current?.focus();
  }

  return (
    <dialog
      ref={dialogRef}
      className="wf-confirm-dialog wf-panel w-[min(100%,28rem)] p-5"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClose={returnFocus}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <div className="mt-2 text-sm text-[var(--text-secondary)]">{children}</div>
      {checkbox ? (
        <label
          htmlFor={checkbox.id}
          className="mt-4 flex items-start gap-2 text-sm font-medium text-[var(--text-primary)]"
        >
          <input
            id={checkbox.id}
            type="checkbox"
            className="mt-0.5"
            checked={checkbox.checked}
            onChange={(e) => checkbox.onChange(e.target.checked)}
          />
          <span>{checkbox.label}</span>
        </label>
      ) : null}
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          className="wf-btn-solid"
          disabled={confirmDisabled || (checkbox ? !checkbox.checked : false)}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button ref={cancelRef} type="button" className="wf-btn" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}
