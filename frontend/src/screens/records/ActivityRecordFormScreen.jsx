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
import Combobox from '@/components/Combobox/Combobox.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import DatePicker from '@/components/DatePicker/DatePicker.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import Progress from '@/components/Progress/Progress.jsx';
import RadioGroup from '@/components/RadioGroup/RadioGroup.jsx';
import Tooltip from '@/components/Tooltip/Tooltip.jsx';
import { useOverlay, useOverlayResult } from '@/hooks/useOverlay.js';
import { useRetryAfter } from '@/hooks/useRetryAfter.js';
import { useSubmitLock } from '@/hooks/useSubmitLock.js';
import { getErrorMessage, getMessage } from '@/messages/index.js';
import { PATHS } from '@/routes/paths.js';
import CompanyFormDialog from '@/screens/companies/CompanyFormDialog.jsx';
import { numberRounds, studentOptions } from '@/screens/rounds/roundHelpers.js';
import {
    ACTIVITY_RECORD_BODY_TOO_LARGE_MESSAGE,
    isRecordBodyTooLarge,
} from '../../../../backend/common/recordInput.mjs';
import RecordSection from './RecordSection.jsx';
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
// Create mode: a new company is registered in a dialog over this form and then selected.
// Moving to the round form and back keeps the input: the form values go in location.state.form
// (as `returnState`), and that screen returns `newRoundId`, which is selected here.
// The round screen of a round (SC-02-05) opens this screen with
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
            companyId: saved.companyId ?? incoming.companyId ?? '',
            applicationRoundId:
                incoming.newRoundId ??
                saved.applicationRoundId ??
                incoming.applicationRoundId ??
                '',
            conductedOn: saved.conductedOn ?? '',
            activityTypes: saved.activityTypes ?? [],
            // Section inputs by type. Kept with the form when moving to the round form and back.
            sections: { ...emptySections(), ...saved.sections },
        };
    });
    const [values, setValues] = useState(initialValues);
    // What counts as "typed input" for the unsaved-changes warning. A new form is compared with an
    // empty one (so input restored from the round form still counts); an edit with the loaded record.
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
    // Field errors { formFieldName: text } and the message at the top of the form, from the last check.
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

    function changeStudent(value) {
        setValues((c) => ({ ...c, studentUserId: value, applicationRoundId: '' }));
    }
    function changeCompany(value) {
        setValues((c) => ({ ...c, companyId: value, applicationRoundId: '' }));
    }
    function toggleType(type, checked) {
        const next = checked
            ? [...values.activityTypes, type]
            : values.activityTypes.filter((t) => t !== type);
        set('activityTypes', next);
    }

    // SC-04-03 opens over this form, so the input stays as it is.
    const companyForm = useOverlay('companyCreate');
    const [addedCompanies, setAddedCompanies] = useState([]);
    useOverlayResult('companyCreate', (saved) => {
        setAddedCompanies((list) => [...list, saved]);
        changeCompany(saved.companyId);
    });
    const companyList = [...companies, ...addedCompanies];

    // Go to the round form and come back to this screen with the input kept.
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
    const roundStage = selectedRound?.stage;
    const needCategory = Boolean(roundStage && roundStage !== 'considering');
    const roundNumbers = numberRounds(rounds);
    const roundOptions = rounds.map((r) => ({
        value: r.applicationRoundId,
        label: `${roundNumbers.get(r.applicationRoundId)}回目の応募`,
        description: `${STAGE_LABELS[r.stage]}${
            r.applicationDate ? `・応募日 ${r.applicationDate}` : ''
        }（ID ${r.applicationRoundId}）`,
    }));
    // Progress bar at the top: the four basic items, then one step per selected activity type,
    // done when nothing in that section would stop completing the record.
    const completionErrors = Object.keys(
        validateActivityRecord(
            {
                activityTypes: values.activityTypes,
                sections: toSectionsPayload(values.activityTypes, values.sections),
            },
            SAVE_MODES.COMPLETE,
            roundStage ?? 'considering',
        ),
    );
    const progressSteps = [
        values.companyId,
        selectedRoundId,
        values.activityTypes.length > 0,
        values.conductedOn.trim(),
        ...values.activityTypes.map(
            (type) => !completionErrors.some((key) => key.startsWith(`sections.${type}`)),
        ),
    ];
    const stepsDone = progressSteps.filter(Boolean).length;
    const lockedTip = isEdit ? '保存後は変更できません' : '';

    function showFieldErrors(errors, mode) {
        setFieldErrors(getFieldErrorTexts(errors, values.activityTypes));
        const messageId =
            mode === SAVE_MODES.COMPLETE && errors.sections === 'E-213' ? 'E-213' : 'E-001';
        setFormError(getMessage(messageId));
    }

    // Check the request before submitting or opening the confirmation dialog.
    function requestSave(mode, confirmed = false) {
        if (submitting || roundsLoading || retry.secondsLeft > 0) return;
        setResultUnknown(false);

        const input = {
            companyId: values.companyId,
            applicationRoundId: selectedRoundId,
            activityTypes: values.activityTypes,
            ...(values.conductedOn.trim() && { conductedOn: values.conductedOn.trim() }),
            sections: toSectionsPayload(values.activityTypes, values.sections),
            ...(!isEdit && { mode }),
            ...(!isEdit && isAdmin && { ownerUserId: values.studentUserId }),
        };
        if (isRecordBodyTooLarge(input)) {
            setFieldErrors({});
            setFormError(ACTIVITY_RECORD_BODY_TOO_LARGE_MESSAGE);
            setConfirmCompleteOpen(false);
            return;
        }

        // If the stage is unavailable, leave its category requirement to the server.
        const errors = validateActivityRecord(input, mode, roundStage ?? 'considering');
        if (Object.keys(errors).length > 0) {
            showFieldErrors(errors, mode);
            setConfirmCompleteOpen(false);
            return;
        }

        setFieldErrors({});
        setFormError('');

        // Completing a draft publishes it, so ask first. Saving a completed record needs no confirm.
        if (mode === SAVE_MODES.COMPLETE && !isCompletedRecord && !confirmed) {
            setConfirmCompleteOpen(true);
        } else {
            save(mode, input);
        }
    }

    // R-01 (new), R-05 (draft), R-06 (complete a draft) or R-07 (edit a completed record).
    // Nothing is resent automatically: if the result is unknown, the person checks the list.
    function save(mode, input) {
        setPendingMode(mode);
        run(async () => {
            try {
                if (!isEdit) {
                    await createActivityRecord(input);
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
                    showFieldErrors(error.fieldErrors, mode);
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
        <>
            <form
                className="record-form__card"
                onSubmit={(event) => event.preventDefault()}
                noValidate
            >
                <Progress
                    className="record-form__progress"
                    segments={progressSteps.length}
                    value={stepsDone}
                    label="入力状況"
                    showValue
                    tone={stepsDone === progressSteps.length ? 'success' : 'primary'}
                />
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
                        <FormField label="対象学生" required error={fieldErrors.ownerUserId}>
                            <Combobox
                                placeholder="学生を選択（名前で絞り込めます）"
                                options={studentOptions(students)}
                                value={values.studentUserId}
                                onChange={changeStudent}
                            />
                        </FormField>
                    )}

                    <FormField label="企業" required error={fieldErrors.companyId}>
                        <Tooltip content={lockedTip} focusable className="record-form__locked">
                            <Combobox
                                placeholder="企業を選択（名前で絞り込めます）"
                                options={companyList.map((c) => ({
                                    value: c.companyId,
                                    label: c.nameOfficial,
                                }))}
                                value={values.companyId}
                                onChange={changeCompany}
                                disabled={isEdit}
                            />
                        </Tooltip>
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
                                onClick={() => companyForm.open()}
                            >
                                企業を登録
                            </button>
                            してください。
                        </p>
                    )}

                    <FormField
                        group
                        label="応募回"
                        required
                        hint="応募回は、保存の前に登録しておく必要があります。"
                        error={fieldErrors.applicationRoundId}
                    >
                        {roundOptions.length > 0 ? (
                            <Tooltip content={lockedTip} focusable className="record-form__locked">
                                <RadioGroup
                                    variant="card"
                                    options={roundOptions}
                                    value={selectedRoundId}
                                    onChange={(value) => set('applicationRoundId', value)}
                                    disabled={isEdit || roundsLoading}
                                />
                            </Tooltip>
                        ) : (
                            <p className="record-form__empty">
                                {!roundsKey
                                    ? '企業を選択すると、応募回が表示されます。'
                                    : roundsLoading
                                      ? ''
                                      : 'この企業の応募回はまだありません。'}
                            </p>
                        )}
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
                        hint="下書きでは未入力でも保存できます。直接入力するか、カレンダーから選べます。"
                    >
                        <DatePicker
                            value={values.conductedOn}
                            onChange={(value) => set('conductedOn', value)}
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
                        <RecordSection
                            key={section.type}
                            section={section}
                            value={values.sections[section.type]}
                            onChange={(next) => setSection(section.type, next)}
                            needCategory={needCategory}
                            errors={sectionErrorTexts(fieldErrors, section.type)}
                            errorsVersion={fieldErrors}
                        />
                    ))}
                </fieldset>

                <p className="record-form__hint">
                    <Link to={PATHS.rounds}>応募企業・選考進捗</Link>
                </p>

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
                            disabled={submitting || roundsLoading || retry.secondsLeft > 0}
                            onClick={() => requestSave(SAVE_MODES.DRAFT)}
                        >
                            下書き保存
                        </Button>
                    )}
                    <Button
                        loading={submitting && pendingMode === SAVE_MODES.COMPLETE}
                        disabled={submitting || roundsLoading || retry.secondsLeft > 0}
                        onClick={() => requestSave(SAVE_MODES.COMPLETE)}
                    >
                        {isCompletedRecord ? '保存' : '記入完了'}
                    </Button>
                </div>

                <ConfirmDialog
                    open={confirmCompleteOpen}
                    title="記入完了の確認"
                    message={getMessage('C-001')}
                    confirmLabel="記入完了にする"
                    loading={submitting}
                    onConfirm={() => requestSave(SAVE_MODES.COMPLETE, true)}
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
            <CompanyFormDialog overlay={companyForm} />
        </>
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
