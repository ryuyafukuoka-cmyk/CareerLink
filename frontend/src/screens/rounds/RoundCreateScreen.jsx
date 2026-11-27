import { useEffect, useId, useState } from 'react';
import { generatePath, useLocation, useNavigate } from 'react-router-dom';
import { ROLES } from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import { PATHS } from '@/routes/paths.js';
import RoundForm from './RoundForm.jsx';
import './RoundScreens.css';

// TEMPORARY page for SC-02-06 (/rounds/new). The round list and the home screen use
// RoundFormDialog now. Only the record form (SC-02-03) still navigates here with
// location.state = { returnTo, returnState, companyId, studentUserId } and gets `newRoundId` back.
// Delete this page, its route and its breadcrumb when the record form becomes a drawer
// (docs/hover-ui.md, step 4).
function RoundCreateScreen() {
    const formId = useId();
    const navigate = useNavigate();
    const { state } = useLocation();
    const { role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;
    const [status, setStatus] = useState({ dirty: false, saving: false, blocked: false });

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${isAdmin}|${reloadCount}`;

    useEffect(() => {
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
    }, [isAdmin, requestKey]);

    const loaded = result.key === requestKey ? result : { data: null, error: null };
    const cancelPath = state?.returnTo ?? PATHS.rounds;

    function handleSaved(saved) {
        if (state?.returnTo) {
            navigate(state.returnTo, {
                replace: true,
                state: { ...state.returnState, newRoundId: saved.applicationRoundId },
            });
        } else {
            navigate(generatePath(PATHS.rounds), { replace: true, state: { noticeId: 'S-302' } });
        }
    }

    return (
        <main className="round-screen round-screen--form">
            <h1>応募回の登録</h1>
            {!loaded.data && !loaded.error && <Loading />}
            {loaded.error && (
                <ErrorMessage error={loaded.error} onRetry={() => setReloadCount((n) => n + 1)} />
            )}
            {loaded.data && (
                <div className="round-screen__card">
                    <RoundForm
                        id={formId}
                        companies={loaded.data.companies}
                        students={loaded.data.students}
                        defaults={state}
                        onSaved={handleSaved}
                        onStatusChange={setStatus}
                    />
                    <div className="round-screen__actions">
                        <Button
                            variant="secondary"
                            disabled={status.saving}
                            onClick={() => navigate(cancelPath)}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="submit"
                            form={formId}
                            loading={status.saving}
                            disabled={status.blocked}
                        >
                            登録する
                        </Button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default RoundCreateScreen;
