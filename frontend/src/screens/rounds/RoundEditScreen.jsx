import { useEffect, useState } from 'react';
import { Link, generatePath, useNavigate, useParams } from 'react-router-dom';
import { STAGE_OPTIONS, isConsidering } from '@shared/definitions';
import { getCompany } from '@/api/companies.js';
import { getApplicationRound, updateApplicationRound } from '@/api/rounds.js';
import Button from '@/components/Button/Button.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Select from '@/components/Select/Select.jsx';
import TextArea from '@/components/TextArea/TextArea.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { useSubmitLock } from '@/hooks/useSubmitLock.js';
import { getErrorMessage, getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { isRealDate } from '@/utils/date.js';
import { fieldMessage } from './roundHelpers.js';
import './RoundScreens.css';

// The form for one round. Students (owner) and admins only; the API checks again.
function RoundEditForm({ round }) {
    const navigate = useNavigate();
    const { submitting, run } = useSubmitLock();
    const [values, setValues] = useState({
        stage: round.stage,
        applicationDate: round.applicationDate ?? '',
        statusNote: round.statusNote ?? '',
    });
    const [errors, setErrors] = useState({}); // { field: messageId }
    const [formError, setFormError] = useState(null);

    const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));
    const errorText = (field) => (errors[field] ? fieldMessage(field, errors[field]) : undefined);
    const detailPath = generatePath(PATHS.roundDetail, { roundId: round.applicationRoundId });

    function validate() {
        const found = {};
        const date = values.applicationDate.trim();
        if (!values.stage) found.stage = 'E-211';
        if (date && !isRealDate(date)) found.applicationDate = 'E-202';
        // The date may be empty only while the stage is "considering". Nothing is filled in automatically.
        else if (!date && values.stage && !isConsidering(values.stage)) {
            found.applicationDate = 'E-215';
        }
        return found;
    }

    function handleSubmit(event) {
        event.preventDefault();
        if (submitting) return;
        setFormError(null);

        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        run(async () => {
            try {
                await updateApplicationRound(round.applicationRoundId, {
                    stage: values.stage,
                    applicationDate: values.applicationDate.trim() || null,
                    statusNote: values.statusNote,
                });
                navigate(detailPath, { replace: true, state: { noticeId: 'S-301' } });
            } catch (error) {
                if (Object.keys(error.fieldErrors ?? {}).length > 0) {
                    setErrors(error.fieldErrors);
                } else if (error.status === 0 || error.status >= 500) {
                    setFormError(getMessage('E-008')); // input stays on screen
                } else {
                    setFormError(getErrorMessage(error));
                }
            }
        });
    }

    return (
        <form className="round-screen__card" onSubmit={handleSubmit} noValidate>
            {formError && <ErrorMessage message={formError} />}

            <FormField label="選考段階" required error={errorText('stage')}>
                <Select
                    options={STAGE_OPTIONS}
                    value={values.stage}
                    onChange={(event) => set('stage', event.target.value)}
                    disabled={submitting}
                />
            </FormField>

            <FormField
                label="応募日"
                required={!isConsidering(values.stage)}
                error={errorText('applicationDate')}
                hint="「未応募・検討中」以外の選考段階では必須です。YYYY/MM/DD の形式で入力してください。"
            >
                <TextInput
                    placeholder="2026/10/01"
                    value={values.applicationDate}
                    onChange={(event) => set('applicationDate', event.target.value)}
                    disabled={submitting}
                />
            </FormField>

            <FormField
                label="選考状況"
                error={errorText('statusNote')}
                hint="面談・一次面接などの進み具合や、補足を自由に書けます。"
            >
                <TextArea
                    value={values.statusNote}
                    onChange={(event) => set('statusNote', event.target.value)}
                    disabled={submitting}
                />
            </FormField>

            <div className="round-screen__actions">
                <Button
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => navigate(detailPath)}
                >
                    キャンセル
                </Button>
                <Button type="submit" loading={submitting}>
                    更新する
                </Button>
            </div>
        </form>
    );
}

// SC-02-07 Progress edit (/rounds/:roundId/edit): stage, application date, selection status.
function RoundEditScreen() {
    const { roundId } = useParams();
    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${roundId}|${reloadCount}`;

    useEffect(() => {
        let cancelled = false;
        async function load() {
            const round = await getApplicationRound(roundId);
            const company = await getCompany(round.companyId).catch(() => null);
            return { round, companyName: company?.nameOfficial ?? null };
        }
        load()
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [roundId, requestKey]);

    const loaded = result.key === requestKey ? result : { data: null, error: null };

    return (
        <main className="round-screen round-screen--form">
            <h1>選考進捗の編集</h1>
            {!loaded.data && !loaded.error && <Loading />}
            {loaded.error && (
                <>
                    <ErrorMessage
                        error={loaded.error}
                        onRetry={
                            loaded.error.status === 404 || loaded.error.status === 403
                                ? undefined
                                : () => setReloadCount((n) => n + 1)
                        }
                    />
                    <Link to={PATHS.rounds}>応募企業・選考進捗へ戻る</Link>
                </>
            )}
            {loaded.data && (
                <>
                    {loaded.data.companyName && (
                        <p className="round-screen__hint">企業：{loaded.data.companyName}</p>
                    )}
                    <RoundEditForm
                        key={loaded.data.round.applicationRoundId}
                        round={loaded.data.round}
                    />
                </>
            )}
        </main>
    );
}

export default RoundEditScreen;
