import Button from '@/components/Button/Button.jsx';
import Overlay from '@/components/Overlay/Overlay.jsx';
import './ConfirmDialog.css';

// Modal confirm / cancel dialog, built on Overlay (same animation, focus trap and stacking).
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
    return (
        <Overlay
            open={open}
            size="sm"
            role="alertdialog"
            title={title}
            hideClose
            busy={loading}
            onClose={onCancel}
            footer={
                <>
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
                </>
            }
        >
            <div className="confirm-dialog__body">
                {message && <p>{message}</p>}
                {children}
            </div>
        </Overlay>
    );
}

export default ConfirmDialog;
