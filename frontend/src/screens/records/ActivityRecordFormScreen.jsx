import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ACTIVITY_TYPE_LABELS,
    ACTIVITY_TYPE_ORDER,
    ROLES,
    STAGE_LABELS,
    getSectionDefinitions,
} from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import { listApplicationRounds } from '@/api/rounds.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import Checkbox from '@/components/Checkbox/Checkbox.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Select from '@/components/Select/Select.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { PATHS } from '@/routes/paths.js';
import { studentOptions } from '@/screens/rounds/roundHelpers.js';
import './ActivityRecordFormScreen.css';

// Latest round = the one with the highest ID.
const latestRoundId = (rounds) =>
    rounds.reduce(
        (max, r) => (Number(r.applicationRoundId) > Number(max) ? r.applicationRoundId : max),
        '',
    );

// The form. Companies (and students, for admins) are already loaded.
//
// Moving to the round / company form and back keeps the input: the form values go in location.state.form
// (as `returnState`), and the other screen returns `newRoundId` / `newCompanyId` which are selected here.
// The round screen of a round (SC-02-05) opens this screen with { applicationRoundId, companyId, studentUserId }.
function RecordForm({ companies, students }) {
    const navigate = useNavigate();
    const location = useLocation();
    const incoming = location.state ?? {};
    const { user, role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;

    const saved = incoming.form ?? {};
    const [values, setValues] = useState({
        studentUserId: isAdmin
            ? (saved.studentUserId ?? incoming.studentUserId ?? '')
            : user.userId,
        companyId: incoming.newCompanyId ?? saved.companyId ?? incoming.companyId ?? '',
        applicationRoundId:
            incoming.newRoundId ?? saved.applicationRoundId ?? incoming.applicationRoundId ?? '',
        conductedOn: saved.conductedOn ?? '',
        activityTypes: saved.activityTypes ?? [],
    });
    const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));

    // Rounds of the chosen student and company.
    const roundsKey =
        values.studentUserId && values.companyId
            ? `${values.studentUserId}|${values.companyId}`
            : null;
    const [roundsResult, setRoundsResult] = useState({ key: null, rounds: [], error: null });
    const [reloadCount, setReloadCount] = useState(0);
    const fetchKey = roundsKey && `${roundsKey}|${reloadCount}`;

    useEffect(() => {
        if (!fetchKey) return undefined;
        let cancelled = false;
        listApplicationRounds({ studentUserId: values.studentUserId, companyId: values.companyId })
            .then((rounds) => !cancelled && setRoundsResult({ key: fetchKey, rounds, error: null }))
            .catch((error) => !cancelled && setRoundsResult({ key: fetchKey, rounds: [], error }));
        return () => {
            cancelled = true;
        };
    }, [fetchKey, values.studentUserId, values.companyId]);

    const roundsLoading = Boolean(fetchKey) && roundsResult.key !== fetchKey;
    const rounds = fetchKey && roundsResult.key === fetchKey ? roundsResult.rounds : [];
    const roundsError = fetchKey && roundsResult.key === fetchKey ? roundsResult.error : null;

    // The chosen round, or the latest one while nothing valid is chosen yet.
    const selectedRoundId = rounds.some((r) => r.applicationRoundId === values.applicationRoundId)
        ? values.applicationRoundId
        : latestRoundId(rounds);

    function changeStudent(event) {
        setValues((c) => ({ ...c, studentUserId: event.target.value, applicationRoundId: '' }));
    }
    function changeCompany(event) {
        setValues((c) => ({ ...c, companyId: event.target.value, applicationRoundId: '' }));
    }
    function toggleType(type, checked) {
        const next = checked
            ? [...values.activityTypes, type]
            : values.activityTypes.filter((t) => t !== type);
        set('activityTypes', next);
    }

    // Go to the round / company form and come back to this screen with the input kept.
    function openOther(path, extra) {
        navigate(path, {
            state: {
                returnTo: location.pathname,
                returnState: { form: { ...values, applicationRoundId: selectedRoundId } },
                companyId: values.companyId || undefined,
                studentUserId: values.studentUserId || undefined,
                ...extra,
            },
        });
    }

    const sections = getSectionDefinitions(values.activityTypes);
    const selectedRound = rounds.find((r) => r.applicationRoundId === selectedRoundId);

    return (
        <form className="record-form__card" onSubmit={(event) => event.preventDefault()} noValidate>
            {isAdmin && (
                <FormField label="対象学生" required>
                    <Select
                        placeholder="学生を選択"
                        options={studentOptions(students)}
                        value={values.studentUserId}
                        onChange={changeStudent}
                    />
                </FormField>
            )}

            <FormField label="企業" required>
                <Select
                    placeholder="企業を選択"
                    options={companies.map((c) => ({ value: c.companyId, label: c.nameOfficial }))}
                    value={values.companyId}
                    onChange={changeCompany}
                />
            </FormField>
            <p className="record-form__hint">
                企業が見つからない場合は、
                <button
                    type="button"
                    className="record-form__link"
                    onClick={() => openOther(PATHS.companyNew)}
                >
                    企業を登録
                </button>
                してください。
            </p>

            <FormField
                label="応募回"
                required
                hint="応募回は、保存の前に登録しておく必要があります。"
            >
                <Select
                    placeholder={
                        values.companyId && values.studentUserId
                            ? '応募回を選択'
                            : '企業を選択してください'
                    }
                    options={rounds.map((r) => ({
                        value: r.applicationRoundId,
                        label: `ID ${r.applicationRoundId}（${STAGE_LABELS[r.stage]}${
                            r.applicationDate ? `・応募日 ${r.applicationDate}` : ''
                        }）`,
                    }))}
                    value={selectedRoundId}
                    onChange={(event) => set('applicationRoundId', event.target.value)}
                    disabled={!roundsKey || roundsLoading}
                />
            </FormField>
            {roundsLoading && <Loading />}
            {roundsError && (
                <ErrorMessage error={roundsError} onRetry={() => setReloadCount((n) => n + 1)} />
            )}
            <p className="record-form__hint">
                この企業の応募回がない場合は、
                <button
                    type="button"
                    className="record-form__link"
                    disabled={!roundsKey}
                    onClick={() => openOther(PATHS.roundNew)}
                >
                    応募回を登録
                </button>
                してください。登録後、この画面に戻ります。
                {selectedRound && `（選考段階：${STAGE_LABELS[selectedRound.stage]}）`}
            </p>

            <FormField
                label="実施日"
                hint="下書きでは未入力でも保存できます。YYYY/MM/DD の形式で入力してください。"
            >
                <TextInput
                    placeholder="2026/10/01"
                    value={values.conductedOn}
                    onChange={(event) => set('conductedOn', event.target.value)}
                />
            </FormField>

            <FormField group label="活動種別" required hint="複数選択できます。">
                <div className="record-form__types">
                    {ACTIVITY_TYPE_ORDER.map((type) => (
                        <Checkbox
                            key={type}
                            label={ACTIVITY_TYPE_LABELS[type]}
                            checked={values.activityTypes.includes(type)}
                            onChange={(event) => toggleType(type, event.target.checked)}
                        />
                    ))}
                </div>
            </FormField>

            {sections.map((section) => (
                <section key={section.type} className="record-form__section">
                    <h2>{section.label}</h2>
                    {/* The inputs of each section are added next (interview first). */}
                    <p className="record-form__hint">
                        入力項目：{section.fields.map((field) => field.label).join('、')}
                    </p>
                </section>
            ))}

            <div className="record-form__actions">
                <Button variant="secondary" onClick={() => navigate(PATHS.records)}>
                    キャンセル
                </Button>
            </div>
            <p className="record-form__hint">
                <Link to={PATHS.rounds}>応募企業・選考進捗</Link>
            </p>
        </form>
    );
}

// SC-02-03 Record form, create mode (/records/new). Loads the select options, then shows the form.
function ActivityRecordFormScreen() {
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
        <main className="record-form">
            <h1>活動記録の登録</h1>
            {!loaded.data && !loaded.error && <Loading />}
            {loaded.error && (
                <ErrorMessage error={loaded.error} onRetry={() => setReloadCount((n) => n + 1)} />
            )}
            {loaded.data && <RecordForm {...loaded.data} />}
        </main>
    );
}

export default ActivityRecordFormScreen;
