import React from "react";

export default function ConfirmDialog({
  isOpen,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  confirmDisabled = false,
  className = "",
}) {
  if (!isOpen) return null;
  return (
    <div
      className={`sd-modalOverlay ${className}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="sd-modalCard">
        {title ? <div className="sd-modalTitle">{title}</div> : null}
        <div className="sd-modalBody">{children}</div>
        <div className="sd-modalActions">
          <button
            type="button"
            className="sd-modalBtn is-primary"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="sd-modalBtn is-accent"
            onClick={onCancel}
            disabled={confirmDisabled}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
