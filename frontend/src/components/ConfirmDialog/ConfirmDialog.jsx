import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/Button/Button.jsx';
import './ConfirmDialog.css';

const FOCUSABLE =
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';

// Modal confirm / cancel dialog.
// message: plain text. children: extra content (for example the company-name input in delete step 3).
// loading: confirm button shows "処理中…", and Esc / outside click / cancel are blocked.
// variant: 'primary' | 'danger' (color of the confirm button).
function ConfirmDialog({
    open,
    title,
    message,
    children,
    confirmLabel = 'OK',
    cancelLabel = 'キャンセル',
    variant = 'primary',
    loading = false,
    confirmDisabled = false,
    onConfirm,
    onCancel,
}) {
    const dialogRef = useRef(null);
    const titleId = useId();
    // Keep the latest values for the key handler without re-running the focus effect.
    const onCancelRef = useRef(onCancel);
    const loadingRef = useRef(loading);
    useEffect(() => {
        onCancelRef.current = onCancel;
        loadingRef.current = loading;
    });

    // Focus the dialog on open, keep Tab inside, close on Esc, give focus back on close.
    useEffect(() => {
        if (!open) return undefined;
        const previouslyFocused = document.activeElement;
        dialogRef.current?.focus();

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!loadingRef.current) onCancelRef.current();
                return;
            }
            if (event.key !== 'Tab' || !dialogRef.current) return;

            const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
            if (items.length === 0) {
                event.preventDefault();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && (active === first || active === dialogRef.current)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div
            className="confirm-dialog__overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) onCancel();
            }}
        >
            <div
                ref={dialogRef}
                className="confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <h2 id={titleId} className="confirm-dialog__title">
                    {title}
                </h2>
                <div className="confirm-dialog__body">
                    {message && <p>{message}</p>}
                    {children}
                </div>
                <div className="confirm-dialog__actions">
                    <Button variant="secondary" onClick={onCancel} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={onConfirm}
                        loading={loading}
                        loadingText="処理中…"
                        disabled={confirmDisabled}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default ConfirmDialog;
