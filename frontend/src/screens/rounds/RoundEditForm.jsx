import { useEffect, useRef, useState } from 'react';
import { STAGE_OPTIONS, isConsidering } from '@shared/definitions';
import { updateApplicationRound } from '@/api/rounds.js';
import DatePicker from '@/components/DatePicker/DatePicker.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import RadioGroup from '@/components/RadioGroup/RadioGroup.jsx';
import TextArea from '@/components/TextArea/TextArea.jsx';
import { useSubmitLock } from '@/hooks/useSubmitLock.js';
import { getErrorMessage, getMessage } from '@/messages';
import { isRealDate } from '@/utils/date.js';
import { fieldMessage } from './roundHelpers.js';
import './RoundScreens.css';

// SC-02-07 The progress edit form body, shown inside RoundEditDialog.
// round: the round being edited. companyName: shown as a read-only line (may be null).
// Students (owner) and admins only; the API checks again.
// onSaved(round): the round was saved. onStatusChange({ dirty, saving }): for the dialog frame.
function RoundEditForm({ id, round, companyName, onSaved, onStatusChange }) {
    const { submitting, run } = useSubmitLock();
    const [initialValues] = useState(() => ({
        stage: round.stage,
        applicationDate: round.applicationDate ?? '',
        statusNote: round.statusNote ?? '',
    }));
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({}); // { field: messageId }
    const [formError, setFormError] = useState(null);

    const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
    useEffect(() => {
        onStatusChange({ dirty, saving: submitting });
    }, [dirty, submitting, onStatusChange]);

    // After a failed check, move the focus to the first field with an error.
    const formRef = useRef(null);
    const [focusRequest, setFocusRequest] = useState(0);
    useEffect(() => {
        if (focusRequest === 0) return;
        formRef.current
            ?.querySelector('.form-field--error input, .form-field--error textarea')
            ?.focus();
    }, [focusRequest]);

    const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));
    const errorText = (field) => (errors[field] ? fieldMessage(field, errors[field]) : undefined);

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
        event.stopPropagation(); // never reaches a form of the page underneath
        if (submitting) return;
        setFormError(null);

        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) {
            setFocusRequest((n) => n + 1);
            return;
        }

        run(async () => {
            try {
                const saved = await updateApplicationRound(round.applicationRoundId, {
                    stage: values.stage,
                    applicationDate: values.applicationDate.trim() || null,
                    statusNote: values.statusNote,
                });
                onSaved(saved);
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
        <form id={id} ref={formRef} className="round-form" onSubmit={handleSubmit} noValidate>
            {companyName && <p className="round-form__company">企業：{companyName}</p>}
            {formError && <ErrorMessage message={formError} />}

            <FormField group label="選考段階" required error={errorText('stage')}>
                <RadioGroup
                    options={STAGE_OPTIONS}
                    value={values.stage}
                    onChange={(value) => set('stage', value)}
                    disabled={submitting}
                />
            </FormField>

            <FormField
                label="応募日"
                required={!isConsidering(values.stage)}
                error={errorText('applicationDate')}
                hint="「未応募・検討中」以外の選考段階では必須です。入力または、カレンダーから選べます。"
            >
                <DatePicker
                    value={values.applicationDate}
                    onChange={(value) => set('applicationDate', value)}
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
        </form>
    );
}

export default RoundEditForm;
