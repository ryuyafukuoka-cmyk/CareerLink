import { useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/Button/Button.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import Dialog from '@/components/Dialog/Dialog.jsx';
import { getMessage } from '@/messages';
import CompanyForm from './CompanyForm.jsx';

// SC-04-03 Company form as a hover UI: create (`company` omitted) or edit.
// overlay: the parent's useOverlay(name). A successful save closes it with the saved company.
// Render it outside any <form> of the parent page.
function CompanyFormDialog({ overlay, company = null }) {
    const formId = useId();
    const isEdit = company !== null;
    const [status, setStatus] = useState({ dirty: false, saving: false });

    // Cancel asks C-003 too (Dialog itself only covers Esc, backdrop and X).
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    if (!overlay.isOpen && confirmingCancel) setConfirmingCancel(false);

    // The save finishes later: use the latest close(), so nothing extra is navigated
    // if the dialog was already closed with the Back button.
    const closeRef = useRef(overlay.close);
    useEffect(() => {
        closeRef.current = overlay.close;
    });

    const dialog = (
        <Dialog
            open={overlay.isOpen}
            title={isEdit ? '企業情報の編集' : '企業の登録'}
            dirty={status.dirty}
            busy={status.saving}
            onClose={() => overlay.close()}
            footer={
                <>
                    <Button
                        variant="secondary"
                        disabled={status.saving}
                        onClick={() => (status.dirty ? setConfirmingCancel(true) : overlay.close())}
                    >
                        キャンセル
                    </Button>
                    <Button type="submit" form={formId} loading={status.saving}>
                        {isEdit ? '更新する' : '登録する'}
                    </Button>
                </>
            }
        >
            <CompanyForm
                id={formId}
                company={company}
                onSaved={(saved) => closeRef.current(saved)}
                onStatusChange={setStatus}
            />
        </Dialog>
    );

    return (
        <>
            {dialog}
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

export default CompanyFormDialog;
