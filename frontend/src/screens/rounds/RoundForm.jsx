import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROLES } from '@shared/definitions';
import { createApplicationRound } from '@/api/rounds.js';
import { useAuth } from '@/auth/useAuth.js';
import Combobox from '@/components/Combobox/Combobox.jsx';
import DatePicker from '@/components/DatePicker/DatePicker.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Select from '@/components/Select/Select.jsx';
import { useOverlay, useOverlayResult } from '@/hooks/useOverlay.js';
import { useRetryAfter } from '@/hooks/useRetryAfter.js';
import { useSubmitLock } from '@/hooks/useSubmitLock.js';
import { getErrorMessage, getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import CompanyFormDialog from '@/screens/companies/CompanyFormDialog.jsx';
import { isRealDate } from '@/utils/date.js';
import { fieldMessage, studentOptions } from './roundHelpers.js';
import './RoundScreens.css';

// SC-02-06 The round create form body. Used in RoundFormDialog (and, until the record form
// becomes a drawer, in the /rounds/new page that the record form still opens).
// companies (and students, for admins) are already loaded.
// defaults: { studentUserId?, companyId? } to preselect.
// onSaved(round): the round was saved. onStatusChange({ dirty, saving, blocked }): for the dialog frame.
function RoundForm({ id, companies, students, defaults = null, onSaved, onStatusChange }) {
    const { user, role } = useAuth();
    const isAdmin = role === ROLES.ADMIN;
    const { submitting, run } = useSubmitLock();
    const retry = useRetryAfter();

    const [initialValues] = useState(() => ({
        studentUserId: isAdmin ? (defaults?.studentUserId ?? '') : user.userId,
        companyId: defaults?.companyId ?? '',
        applicationDate: '',
    }));
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({}); // { field: messageId }
    const [formError, setFormError] = useState(null);
    const [resultUnknown, setResultUnknown] = useState(false);

    const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
    const blocked = retry.secondsLeft > 0;
    useEffect(() => {
        onStatusChange({ dirty, saving: submitting, blocked });
    }, [dirty, submitting, blocked, onStatusChange]);

    // SC-04-03 opens over this form; the new company is then selected.
    const companyForm = useOverlay('companyCreate');
    const [addedCompanies, setAddedCompanies] = useState([]);
    useOverlayResult('companyCreate', (saved) => {
        setAddedCompanies((list) => [...list, saved]);
        set('companyId', saved.companyId);
    });
    const companyList = [...companies, ...addedCompanies];

    // After a failed check, move the focus to the first field with an error.
    const formRef = useRef(null);
    const [focusRequest, setFocusRequest] = useState(0);
    useEffect(() => {
        if (focusRequest === 0) return;
        formRef.current
            ?.querySelector('.form-field--error input, .form-field--error select')
            ?.focus();
    }, [focusRequest]);

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
        event.stopPropagation(); // never reaches a form of the page underneath
        if (submitting || blocked) return;
        setFormError(null);
        setResultUnknown(false);

        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) {
            setFocusRequest((n) => n + 1);
            return;
        }

        run(async () => {
            try {
                const saved = await createApplicationRound({
                    studentUserId: values.studentUserId,
                    companyId: values.companyId,
                    applicationDate: values.applicationDate.trim() || null,
                });
                onSaved(saved);
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

    return (
        <>
            <form id={id} ref={formRef} className="round-form" onSubmit={handleSubmit} noValidate>
                {blocked && (
                    <ErrorMessage message={getMessage('E-009', { seconds: retry.secondsLeft })} />
                )}
                {formError && <ErrorMessage message={formError} />}
                {resultUnknown && (
                    <p className="round-form__hint">
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
                    <Combobox
                        placeholder="企業名で絞り込み"
                        options={companyList.map((c) => ({
                            value: c.companyId,
                            label: c.nameOfficial,
                        }))}
                        value={values.companyId}
                        onChange={(value) => set('companyId', value)}
                        disabled={submitting}
                    />
                </FormField>
                <p className="round-form__hint">
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
                    hint="任意です。入力または、カレンダーから選べます。"
                >
                    <DatePicker
                        value={values.applicationDate}
                        onChange={(value) => set('applicationDate', value)}
                        disabled={submitting}
                    />
                </FormField>
                <p className="round-form__hint">
                    選考段階は「未応募・検討中」で登録されます。登録後に変更できます。
                </p>
            </form>
            <CompanyFormDialog overlay={companyForm} />
        </>
    );
}

export default RoundForm;
