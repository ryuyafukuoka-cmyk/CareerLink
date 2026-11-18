import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ACTIVITY_TYPE_LABELS,
    ACTIVITY_TYPE_ORDER,
    RECORD_STATUSES,
    ROLES,
    SAVE_MODES,
    STAGE_LABELS,
    getSectionDefinitions,
} from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import {
    completeActivityRecord,
    createActivityRecord,
    getRecordForEdit,
    saveDraft,
    updateActivityRecord,
} from '@/api/records.js';
import { listApplicationRounds } from '@/api/rounds.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import Checkbox from '@/components/Checkbox/Checkbox.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import Select from '@/components/Select/Select.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { useRetryAfter } from '@/hooks/useRetryAfter.js';
import { useSubmitLock } from '@/hooks/useSubmitLock.js';
import { getErrorMessage, getMessage } from '@/messages/index.js';
import { PATHS } from '@/routes/paths.js';
import { studentOptions } from '@/screens/rounds/roundHelpers.js';
import InterviewSection from './InterviewSection.jsx';
import SimpleSection from './SimpleSection.jsx';
import { emptySections, fromSectionsPayload, toSectionsPayload } from './sectionDefaults.js';
import {
    getFieldErrorTexts,
    sectionErrorTexts,
    validateActivityRecord,
} from './validateActivityRecord.js';
import './ActivityRecordFormScreen.css';

// Latest round = the one with the highest ID.
const latestRoundId = (rounds) =>
    rounds.reduce(
        (max, r) => (Number(r.applicationRoundId) > Number(max) ? r.applicationRoundId : max),
        '',
    );

// The form, for a new record (/records/new) or for editing one (/records/:recordId/edit).
// Companies (and students, for admins creating a record) are already loaded; `record` is set in edit mode.
//
// Create mode: moving to the round / company form and back keeps the input: the form values go in
// location.state.form (as `returnState`), and the other screen returns `newRoundId` / `newCompanyId`
// which are selected here. The round screen of a round (SC-02-05) opens this screen with
// { applicationRoundId, companyId, studentUserId }.
// Edit mode: student, company and round are fixed. A draft has [下書き保存] (R-05) and [記入完了] (R-06);
// a completed record has [保存] (R-07) and stays completed.
function RecordForm({ companies, students, record }) {
    const navigate = useNavigate();
    const location = useLocation();
    const incoming = location.state ?? {};
    const { user, role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;
    const isEdit = Boolean(record);
    const isCompletedRecord = record?.status === RECORD_STATUSES.COMPLETED;

    const [initialValues] = useState(() => {
        if (record) {
            return {
                studentUserId: record.ownerUserId,
                companyId: record.companyId,
                applicationRoundId: record.applicationRoundId,
                conductedOn: record.conductedOn ?? '',
                activityTypes: record.activityTypes,
                sections: fromSectionsPayload(record.sections),
            };
        }
        const saved = incoming.form ?? {};
        return {
            studentUserId: isAdmin
                ? (saved.studentUserId ?? incoming.studentUserId ?? '')
                : user.userId,
            companyId: incoming.newCompanyId ?? saved.companyId ?? incoming.companyId ?? '',
            applicationRoundId:
                incoming.newRoundId ??
                saved.applicationRoundId ??
                incoming.applicationRoundId ??
                '',
            conductedOn: saved.conductedOn ?? '',
            activityTypes: saved.activityTypes ?? [],
            // Section inputs by type. Kept with the form when moving to the company / round form and back.
            sections: { ...emptySections(), ...saved.sections },
        };
    });
    const [values, setValues] = useState(initialValues);
    // What counts as "typed input" for the unsaved-changes warning. A new form is compared with an
    // empty one (so input restored from the company / round form still counts); an edit with the loaded record.
    const dirtyKey = (v) =>
        JSON.stringify({
            conductedOn: v.conductedOn,
            activityTypes: v.activityTypes,
            sections: v.sections,
        });
    const [baselineKey] = useState(() =>
        dirtyKey(
            isEdit
                ? initialValues
                : { conductedOn: '', activityTypes: [], sections: emptySections() },
        ),
    );
    // Field errors { apiFieldName: text } and the message at the top of the form, from the last check.
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');

    // Saving: one send at a time, 429 countdown, and the two confirm dialogs.
    const { submitting, run } = useSubmitLock();
    const retry = useRetryAfter();
    const [pendingMode, setPendingMode] = useState(null);
    const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
    const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
    const [resultUnknown, setResultUnknown] = useState(false);
    const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));
    const setSection = (type, value) =>
        setValues((current) => ({ ...current, sections: { ...current.sections, [type]: value } }));

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
    // In edit mode the round never changes.
    const selectedRoundId =
        isEdit || rounds.some((r) => r.applicationRoundId === values.applicationRoundId)
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

    // Unsaved typing: the date, type tags or section inputs changed.
    // (Picking the student / company / round alone is not counted.)
    const isDirty = dirtyKey(values) !== baselineKey;

    // Warn when the tab is closed or reloaded with unsaved input. (Links inside the app are not
    // blocked: the app uses BrowserRouter, which has no route blocker.)
    useEffect(() => {
        if (!isDirty) return undefined;
        const warn = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [isDirty]);

    const sections = getSectionDefinitions(values.activityTypes);
    const selectedRound = rounds.find((r) => r.applicationRoundId === selectedRoundId);
    // Interview question category: optional only while the chosen round is "considering"
    // (drafts included). With no round chosen yet it is shown as required.
    const needCategory = selectedRound?.stage !== 'considering';

    // Check the input for a save mode.
    function checkInput(mode) {
        const errors = validateActivityRecord(
            { ...values, applicationRoundId: selectedRoundId },
            mode,
            selectedRound?.stage,
        );
        const texts = getFieldErrorTexts(errors, values.activityTypes);
        setFieldErrors(texts);
        const hasErrors = Object.keys(errors).length > 0;
        const messageId = mode === SAVE_MODES.COMPLETE ? 'E-213' : 'E-001';
        setFormError(hasErrors ? getMessage(messageId) : '');
        return !hasErrors;
    }

    // [下書き保存] / [記入完了]: check the input, ask for confirmation before completing, then save.
    function requestSave(mode) {
        if (submitting || retry.secondsLeft > 0) return;
        setResultUnknown(false);
        if (!checkInput(mode)) return;
        // Completing a draft publishes it, so ask first. Saving a completed record needs no confirm.
        if (mode === SAVE_MODES.COMPLETE && !isCompletedRecord) setConfirmCompleteOpen(true);
        else save(mode);
    }

    // R-01 (new), R-05 (draft), R-06 (complete a draft) or R-07 (edit a completed record).
    // Nothing is resent automatically: if the result is unknown, the person checks the list.
    function save(mode) {
        setPendingMode(mode);
        run(async () => {
            try {
                const input = {
                    companyId: values.companyId,
                    applicationRoundId: selectedRoundId,
                    activityTypes: values.activityTypes,
                    ...(values.conductedOn.trim() && { conductedOn: values.conductedOn.trim() }),
                    sections: toSectionsPayload(values.activityTypes, values.sections),
                };
                if (!isEdit) {
                    // Only an admin names the owner; a student's record is owned by the student.
                    await createActivityRecord({
                        ...input,
                        ...(isAdmin && { ownerUserId: values.studentUserId }),
                        mode,
                    });
                    navigate(generatePath(PATHS.roundDetail, { roundId: selectedRoundId }), {
                        replace: true,
                        state: { noticeId: mode === SAVE_MODES.COMPLETE ? 'S-003' : 'S-002' },
                    });
                    return;
                }
                let noticeId = 'S-004';
                if (isCompletedRecord) {
                    await updateActivityRecord(record.recordId, input);
                } else if (mode === SAVE_MODES.COMPLETE) {
                    await completeActivityRecord(record.recordId, input);
                    noticeId = 'S-003';
                } else {
                    await saveDraft(record.recordId, input);
                    noticeId = 'S-002';
                }
                navigate(generatePath(PATHS.recordDetail, { recordId: record.recordId }), {
                    replace: true,
                    state: { noticeId },
                });
            } catch (error) {
                setConfirmCompleteOpen(false);
                if (error.code === 'RATE_LIMITED') {
                    retry.start(error.retryAfter ?? 30);
                } else if (Object.keys(error.fieldErrors ?? {}).length > 0) {
                    setFieldErrors(getFieldErrorTexts(error.fieldErrors, values.activityTypes));
                    setFormError(getMessage(mode === SAVE_MODES.COMPLETE ? 'E-213' : 'E-001'));
                } else if (error.status === 0 || error.status >= 500) {
                    setFormError(getMessage('E-008'));
                    setResultUnknown(true);
                } else {
                    setFormError(getErrorMessage(error));
                }
            }
        });
    }

    const cancelPath = isEdit
        ? generatePath(PATHS.recordDetail, { recordId: record.recordId })
        : (incoming.returnTo ?? PATHS.records);
    const leave = () => navigate(cancelPath);

    return (
        <form className="record-form__card" onSubmit={(event) => event.preventDefault()} noValidate>
            {retry.secondsLeft > 0 && (
                <ErrorMessage message={getMessage('E-009', { seconds: retry.secondsLeft })} />
            )}
            {formError && <Notice tone="error" message={formError} />}
            {resultUnknown && (
                <p>
                    保存できたか分からない場合は、
                    <Link to={PATHS.records}>活動記録の一覧</Link>で確認してください。
                </p>
            )}

            <fieldset className="record-form__fieldset" disabled={submitting}>
                {isAdmin && !isEdit && (
                    <FormField label="対象学生" required>
                        <Select
                            placeholder="学生を選択"
                            options={studentOptions(students)}
                            value={values.studentUserId}
                            onChange={changeStudent}
                        />
                    </FormField>
                )}

                <FormField label="企業" required error={fieldErrors.companyId}>
                    <Select
                        placeholder="企業を選択"
                        options={companies.map((c) => ({
                            value: c.companyId,
                            label: c.nameOfficial,
                        }))}
                        value={values.companyId}
                        onChange={changeCompany}
                        disabled={isEdit}
                    />
                </FormField>
                {isEdit ? (
                    <p className="record-form__hint">
                        企業と応募回は保存後に変更できません。誤っている場合は、この記録を削除して登録し直してください。
                    </p>
                ) : (
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
                )}

                <FormField
                    label="応募回"
                    required
                    hint="応募回は、保存の前に登録しておく必要があります。"
                    error={fieldErrors.applicationRoundId}
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
                        disabled={isEdit || !roundsKey || roundsLoading}
                    />
                </FormField>
                {roundsLoading && <Loading />}
                {roundsError && (
                    <ErrorMessage
                        error={roundsError}
                        onRetry={() => setReloadCount((n) => n + 1)}
                    />
                )}
                {!isEdit && (
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
                )}

                <FormField
                    label="実施日"
                    error={fieldErrors.conductedOn}
                    hint="下書きでは未入力でも保存できます。YYYY/MM/DD の形式で入力してください。"
                >
                    <TextInput
                        placeholder="2026/10/01"
                        value={values.conductedOn}
                        onChange={(event) => set('conductedOn', event.target.value)}
                    />
                </FormField>

                <FormField
                    group
                    label="活動種別"
                    required
                    hint="複数選択できます。"
                    error={fieldErrors.activityTypes}
                >
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
                        {section.type === 'interview' ? (
                            <InterviewSection
                                value={values.sections.interview}
                                onChange={(next) => setSection('interview', next)}
                                needCategory={needCategory}
                                errors={sectionErrorTexts(fieldErrors, 'interview')}
                            />
                        ) : (
                            <SimpleSection
                                section={section}
                                value={values.sections[section.type]}
                                onChange={(next) => setSection(section.type, next)}
                                errors={sectionErrorTexts(fieldErrors, section.type)}
                            />
                        )}
                    </section>
                ))}
            </fieldset>

            <div className="record-form__actions">
                <Button
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => (isDirty ? setConfirmLeaveOpen(true) : leave())}
                >
                    キャンセル
                </Button>
                {!isCompletedRecord && (
                    <Button
                        variant="secondary"
                        loading={submitting && pendingMode === SAVE_MODES.DRAFT}
                        disabled={submitting || retry.secondsLeft > 0}
                        onClick={() => requestSave(SAVE_MODES.DRAFT)}
                    >
                        下書き保存
                    </Button>
                )}
                <Button
                    loading={submitting && pendingMode === SAVE_MODES.COMPLETE}
                    disabled={submitting || retry.secondsLeft > 0}
                    onClick={() => requestSave(SAVE_MODES.COMPLETE)}
                >
                    {isCompletedRecord ? '保存' : '記入完了'}
                </Button>
            </div>
            <p className="record-form__hint">
                <Link to={PATHS.rounds}>応募企業・選考進捗</Link>
            </p>

            <ConfirmDialog
                open={confirmCompleteOpen}
                title="記入完了の確認"
                message={getMessage('C-001')}
                confirmLabel="記入完了にする"
                loading={submitting}
                onConfirm={() => save(SAVE_MODES.COMPLETE)}
                onCancel={() => setConfirmCompleteOpen(false)}
            />
            <ConfirmDialog
                open={confirmLeaveOpen}
                title="入力内容の破棄"
                message={getMessage('C-003')}
                confirmLabel="破棄して戻る"
                variant="danger"
                onConfirm={leave}
                onCancel={() => setConfirmLeaveOpen(false)}
            />
        </form>
    );
}

// SC-02-03 Record form: create (/records/new) or edit (/records/:recordId/edit).
// Loads the select options (and the record, when editing), then shows the form.
function ActivityRecordFormScreen() {
    const { recordId } = useParams();
    const { role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${isAdmin}|${recordId ?? ''}|${reloadCount}`;

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            listCompanyOptions(),
            // The student list is only needed to pick the owner of a new record.
            isAdmin && !recordId
                ? listUsers({ role: ROLES.STUDENT, status: 'active' })
                : Promise.resolve([]),
            recordId ? getRecordForEdit(recordId) : Promise.resolve(null),
        ])
            .then(([companies, students, record]) => {
                if (!cancelled)
                    setResult({
                        key: requestKey,
                        data: { companies, students, record },
                        error: null,
                    });
            })
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [isAdmin, recordId, requestKey]);

    const loaded = result.key === requestKey ? result : { data: null, error: null };

    return (
        <main className="record-form">
            <h1>{recordId ? '活動記録の編集' : '活動記録の登録'}</h1>
            {!loaded.data && !loaded.error && <Loading />}
            {loaded.error && (
                <ErrorMessage error={loaded.error} onRetry={() => setReloadCount((n) => n + 1)} />
            )}
            {loaded.data && <RecordForm key={recordId ?? 'new'} {...loaded.data} />}
        </main>
    );
}

export default ActivityRecordFormScreen;
