import { useEffect, useId, useState } from 'react';
import { ROLES } from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import RoundDialog, { useLatestClose } from './RoundDialog.jsx';
import RoundForm from './RoundForm.jsx';

// SC-02-06 Round create as a hover UI. overlay: the parent's useOverlay('roundCreate').
// open({ studentUserId?, companyId? }) preselects values. A successful save closes it with the new round.
// The companies (and students, for admins) are loaded each time it opens.
function RoundFormDialog({ overlay }) {
    const formId = useId();
    const { role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;
    const closeRef = useLatestClose(overlay);
    const [status, setStatus] = useState({ dirty: false, saving: false, blocked: false });

    // Count the openings, so every opening starts with fresh data and an empty form.
    const [openCount, setOpenCount] = useState(0);
    const [wasOpen, setWasOpen] = useState(false);
    if (overlay.isOpen !== wasOpen) {
        setWasOpen(overlay.isOpen);
        if (overlay.isOpen) setOpenCount((n) => n + 1);
    }

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${isAdmin}|${openCount}|${reloadCount}`;

    useEffect(() => {
        if (!overlay.isOpen) return undefined;
        let cancelled = false;
        Promise.all([
            listCompanyOptions(),
            isAdmin ? listUsers({ role: ROLES.STUDENT, status: 'active' }) : Promise.resolve([]),
        ])
            .then(([companies, students]) => {
                if (!cancelled)
                    setResult({ key: requestKey, data: { companies, students }, error: null });
            })
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [overlay.isOpen, isAdmin, requestKey]);

    const loaded = result.key === requestKey ? result : { data: null, error: null };

    return (
        <RoundDialog
            overlay={overlay}
            title="応募回の登録"
            formId={formId}
            status={status}
            submitLabel="登録する"
            submitDisabled={!loaded.data}
        >
            {!loaded.data && !loaded.error && <Loading />}
            {loaded.error && (
                <ErrorMessage error={loaded.error} onRetry={() => setReloadCount((n) => n + 1)} />
            )}
            {loaded.data && (
                <RoundForm
                    key={openCount}
                    id={formId}
                    companies={loaded.data.companies}
                    students={loaded.data.students}
                    defaults={overlay.params}
                    onSaved={(saved) => closeRef.current(saved)}
                    onStatusChange={setStatus}
                />
            )}
        </RoundDialog>
    );
}

export default RoundFormDialog;
