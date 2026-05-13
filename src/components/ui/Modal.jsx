import React, { useEffect } from 'react';
import './Modal.css';

function Modal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  variant = 'default',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 id="modal-title" className="modal__title">{title}</h2>}
        {message && <p className="modal__message">{message}</p>}
        <div className="modal__actions">
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--md"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ui-btn ui-btn--${variant === 'danger' ? 'danger' : 'primary'} ui-btn--md`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
