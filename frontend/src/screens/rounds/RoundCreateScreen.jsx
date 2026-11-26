import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation, useNavigate } from 'react-router-dom';
import { ROLES } from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import { createApplicationRound } from '@/api/rounds.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Select from '@/components/Select/Select.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { useOverlay, useOverlayResult } from '@/hooks/useOverlay.js';
import { useRetryAfter } from '@/hooks/useRetryAfter.js';
import { useSubmitLock } from '@/hooks/useSubmitLock.js';
import { getErrorMessage, getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import CompanyFormDialog from '@/screens/companies/CompanyFormDialog.jsx';
import { isRealDate } from '@/utils/date.js';
import { fieldMessage, studentOptions } from './roundHelpers.js';
import './RoundScreens.css';

// The form. Companies (and students, for admins) are already loaded.
// Opened from the record form (SC-02-03) with location.state = { returnTo, returnState, companyId, studentUserId }:
// after saving it goes back there with `newRoundId` added, so the record form can select the new round.
function RoundForm({ companies, students }) {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { user, role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;
    const { submitting, run } = useSubmitLock();
    const retry = useRetryAfter();

    const [values, setValues] = useState({
        studentUserId: isAdmin ? (state?.studentUserId ?? '') : user.userId,
        companyId: state?.companyId ?? '',
        applicationDate: '',
    });
    const [errors, setErrors] = useState({}); // { field: messageId }
    const [formError, setFormError] = useState(null);
    const [resultUnknown, setResultUnknown] = useState(false);

    // SC-04-03 opens over this form; the new company is then selected.
    const companyForm = useOverlay('companyCreate');
    const [addedCompanies, setAddedCompanies] = useState([]);
    useOverlayResult('companyCreate', (saved) => {
        setAddedCompanies((list) => [...list, saved]);
        set('companyId', saved.companyId);
    });
    const companyList = [...companies, ...addedCompanies];

    const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));
    const errorText = (field) => (errors[field] ? fieldMessage(field, errors[field]) : undefined);

    function validate() {
        const found = {};
        if (isAdmin && !values.studentUserId) found.studentUserId = 'E-201';
        if (!values.companyId) found.companyId = 'E-201';
        const date = values.applicationDate.trim();
        if (date && !isRealDate(date)) found.applicationDate = 'E-202';
        return found;
    }

    function handleSubmit(event) {
        event.preventDefault();
        if (submitting || retry.secondsLeft > 0) return;
        setFormError(null);
        setResultUnknown(false);

        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        run(async () => {
            try {
                const saved = await createApplicationRound({
                    studentUserId: values.studentUserId,
                    companyId: values.companyId,
                    applicationDate: values.applicationDate.trim() || null,
                });
                if (state?.returnTo) {
                    navigate(state.returnTo, {
                        replace: true,
                        state: { ...state.returnState, newRoundId: saved.applicationRoundId },
                    });
                } else {
                    navigate(generatePath(PATHS.rounds), {
                        replace: true,
                        state: { noticeId: 'S-302' },
                    });
                }
            } catch (error) {
                if (error.code === 'RATE_LIMITED') {
                    retry.start(error.retryAfter ?? 30);
                } else if (Object.keys(error.fieldErrors ?? {}).length > 0) {
                    setErrors(error.fieldErrors);
                } else if (error.status === 0 || error.status >= 500) {
                    // The result is unknown: never resend automatically, let the person check the list.
                    setFormError(getMessage('E-008'));
                    setResultUnknown(true);
                } else {
                    setFormError(getErrorMessage(error));
                }
            }
        });
    }

    const cancelPath = state?.returnTo ?? PATHS.rounds;

    return (
        <>
            <form className="round-screen__card" onSubmit={handleSubmit} noValidate>
                {retry.secondsLeft > 0 && (
                    <ErrorMessage message={getMessage('E-009', { seconds: retry.secondsLeft })} />
                )}
                {formError && <ErrorMessage message={formError} />}
                {resultUnknown && (
                    <p>
                        保存できたか分からない場合は、
                        <Link to={PATHS.rounds}>応募回の一覧</Link>で確認してください。
                    </p>
                )}

                {isAdmin && (
                    <FormField label="対象学生" required error={errorText('studentUserId')}>
                        <Select
                            placeholder="学生を選択"
                            options={studentOptions(students)}
                            value={values.studentUserId}
                            onChange={(event) => set('studentUserId', event.target.value)}
                            disabled={submitting}
                        />
                    </FormField>
                )}

                <FormField label="企業" required error={errorText('companyId')}>
                    <Select
                        placeholder="企業を選択"
                        options={companyList.map((c) => ({
                            value: c.companyId,
                            label: c.nameOfficial,
                        }))}
                        value={values.companyId}
                        onChange={(event) => set('companyId', event.target.value)}
                        disabled={submitting}
                    />
                </FormField>
                <p className="round-screen__hint">
                    企業が見つからない場合は、先に
                    <button
                        type="button"
                        className="round-screen__link"
                        disabled={submitting}
                        onClick={() => companyForm.open()}
                    >
                        企業を登録
                    </button>
                    してください。
                </p>

                <FormField
                    label="応募日"
                    error={errorText('applicationDate')}
                    hint="任意です。YYYY/MM/DD の形式で入力してください。"
                >
                    <TextInput
                        placeholder="2026/10/01"
                        value={values.applicationDate}
                        onChange={(event) => set('applicationDate', event.target.value)}
                        disabled={submitting}
                    />
                </FormField>
                <p className="round-screen__hint">
                    選考段階は「未応募・検討中」で登録されます。登録後に変更できます。
                </p>

                <div className="round-screen__actions">
                    <Button
                        variant="secondary"
                        disabled={submitting}
                        onClick={() => navigate(cancelPath)}
                    >
                        キャンセル
                    </Button>
                    <Button type="submit" loading={submitting} disabled={retry.secondsLeft > 0}>
                        登録する
                    </Button>
                </div>
            </form>
            <CompanyFormDialog overlay={companyForm} />
        </>
    );
}

// SC-02-06 Round create (/rounds/new). Saves the round on its own; records are saved separately.
function RoundCreateScreen() {
    const { role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;

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

    return (
        <main className="round-screen round-screen--form">
            <h1>応募回の登録</h1>
            {!loaded.data && !loaded.error && <Loading />}
            {loaded.error && (
                <ErrorMessage error={loaded.error} onRetry={() => setReloadCount((n) => n + 1)} />
            )}
            {loaded.data && <RoundForm {...loaded.data} />}
        </main>
    );
}

export default RoundCreateScreen;
