import { useId, useState } from 'react';
import RoundDialog, { useLatestClose } from './RoundDialog.jsx';
import RoundEditForm from './RoundEditForm.jsx';

// SC-02-07 Progress edit as a hover UI. overlay: the parent's useOverlay('roundEdit').
// open({ round, companyName }): the round to edit (plain data the parent already has).
// A successful save closes it with the saved round.
function RoundEditDialog({ overlay }) {
    const formId = useId();
    const closeRef = useLatestClose(overlay);
    const [status, setStatus] = useState({ dirty: false, saving: false });
    const params = overlay.params;

    return (
        <RoundDialog
            overlay={overlay}
            title="選考進捗の編集"
            formId={formId}
            status={status}
            submitLabel="更新する"
        >
            {params && (
                <RoundEditForm
                    key={params.round.applicationRoundId}
                    id={formId}
                    round={params.round}
                    companyName={params.companyName}
                    onSaved={(saved) => closeRef.current(saved)}
                    onStatusChange={setStatus}
                />
            )}
        </RoundDialog>
    );
}

export default RoundEditDialog;
