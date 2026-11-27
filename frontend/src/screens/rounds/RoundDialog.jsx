import { useEffect, useRef, useState } from 'react';
import Button from '@/components/Button/Button.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import Dialog from '@/components/Dialog/Dialog.jsx';
import { getMessage } from '@/messages';

// Shared frame of the round dialogs: title, footer (cancel + submit) and the "discard changes?" check.
// overlay: the parent's useOverlay(name). status: { dirty, saving, blocked } reported by the form.
// The submit button belongs to the form through `formId` (the form sits in the dialog body).
// Render it outside any <form> of the parent page.
function RoundDialog({
    overlay,
    title,
    formId,
    status,
    submitLabel,
    submitDisabled = false,
    size = 'md',
    children,
}) {
    // Cancel asks C-003 too (Dialog itself only covers Esc, backdrop and X).
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    if (!overlay.isOpen && confirmingCancel) setConfirmingCancel(false);

    return (
        <>
            <Dialog
                open={overlay.isOpen}
                size={size}
                title={title}
                dirty={status.dirty}
                busy={status.saving}
                onClose={() => overlay.close()}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            disabled={status.saving}
                            onClick={() =>
                                status.dirty ? setConfirmingCancel(true) : overlay.close()
                            }
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="submit"
                            form={formId}
                            loading={status.saving}
                            disabled={submitDisabled || status.blocked}
                        >
                            {submitLabel}
                        </Button>
                    </>
                }
            >
                {children}
            </Dialog>
            <ConfirmDialog
                open={confirmingCancel}
                title="変更を破棄しますか？"
                message={getMessage('C-003')}
                cancelLabel="編集を続ける"
                confirmLabel="破棄する"
                variant="danger"
                onCancel={() => setConfirmingCancel(false)}
                onConfirm={() => {
                    setConfirmingCancel(false);
                    overlay.close();
                }}
            />
        </>
    );
}

// The save finishes later: use the latest close(), so nothing extra is navigated
// if the dialog was already closed with the Back button.
export function useLatestClose(overlay) {
    const closeRef = useRef(overlay.close);
    useEffect(() => {
        closeRef.current = overlay.close;
    });
    return closeRef;
}

export default RoundDialog;
