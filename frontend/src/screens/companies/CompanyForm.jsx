import { useEffect, useRef, useState } from 'react';
import { createCompany, updateCompany } from '@/api/companies.js';
import Checkbox from '@/components/Checkbox/Checkbox.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import RegionSelect from '@/components/RegionSelect/RegionSelect.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { getErrorMessage, getMessage } from '@/messages';
import { validateCompany } from './validateCompany.js';
import './CompanyForm.css';

// Field name (as in the API) -> label used in "{項目名}を入力してください。".
const FIELD_LABELS = {
    nameOfficial: '企業名（正式名称）',
    nameKatakana: '企業名（カタカナ）',
    prefectures: '勤務地',
    websiteUrl: '企業公式サイトURL',
};

function toMessage(field, messageId) {
    return getMessage(messageId, { 項目名: FIELD_LABELS[field] });
}

// The company form body, shown inside CompanyFormDialog (the submit button is in its footer).
// `company` is the company being edited, or null for a new one.
// onStatusChange({ dirty, saving }) tells the dialog when closing needs a confirm or is blocked.
function CompanyForm({ id, company, onSaved, onStatusChange }) {
    const isEdit = company !== null;
    const [initialValues] = useState(() => ({
        nameOfficial: company?.nameOfficial ?? '',
        nameKatakana: company?.nameKatakana ?? '',
        regions: company?.prefectures ?? [],
        websiteUrl: company?.websiteUrl ?? '',
        noWebsite: isEdit && company.websiteUrl === null,
    }));
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({}); // { field: messageId }
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
    useEffect(() => {
        onStatusChange({ dirty, saving });
    }, [dirty, saving, onStatusChange]);

    // After a failed check, move the focus to the first field with an error.
    const formRef = useRef(null);
    const [focusRequest, setFocusRequest] = useState(0);
    useEffect(() => {
        if (focusRequest === 0) return;
        formRef.current
            ?.querySelector('.form-field--error input, .form-field--error summary')
            ?.focus();
    }, [focusRequest]);

    const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));
    const errorText = (field) => (errors[field] ? toMessage(field, errors[field]) : undefined);

    function handleNoWebsiteChange(event) {
        const checked = event.target.checked;
        setValues((current) => ({
            ...current,
            noWebsite: checked,
            websiteUrl: checked ? '' : current.websiteUrl,
        }));
        if (checked) setErrors((current) => ({ ...current, websiteUrl: undefined }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        event.stopPropagation(); // never reaches a form of the page underneath
        if (saving) return;
        setFormError(null);

        const found = validateCompany(values);
        setErrors(found);
        if (Object.keys(found).length > 0) {
            setFocusRequest((n) => n + 1);
            return;
        }

        setSaving(true);
        try {
            const input = {
                nameOfficial: values.nameOfficial.trim(),
                nameKatakana: values.nameKatakana.trim(),
                prefectures: values.regions,
                websiteUrl: values.noWebsite ? null : values.websiteUrl.trim(),
                noWebsite: values.noWebsite,
            };
            const saved = isEdit
                ? await updateCompany(company.companyId, input)
                : await createCompany(input);
            onSaved(saved);
        } catch (error) {
            if (Object.keys(error.fieldErrors ?? {}).length > 0) {
                setErrors(error.fieldErrors);
                setFocusRequest((n) => n + 1);
            } else if (error.status === 0 || error.status >= 500) {
                setFormError(getMessage('E-008')); // input stays on screen
            } else {
                setFormError(getErrorMessage(error));
            }
            setSaving(false);
        }
    }

    return (
        <form ref={formRef} id={id} className="company-form" onSubmit={handleSubmit} noValidate>
            {formError && (
                <div className="company-form__error">
                    <ErrorMessage message={formError} />
                </div>
            )}

            <FormField label="企業名（正式名称）" required error={errorText('nameOfficial')}>
                <TextInput
                    value={values.nameOfficial}
                    onChange={(event) => set('nameOfficial', event.target.value)}
                    disabled={saving}
                />
            </FormField>

            <FormField
                label="企業名（カタカナ）"
                required
                error={errorText('nameKatakana')}
                hint="全角カタカナで入力してください。"
            >
                <TextInput
                    value={values.nameKatakana}
                    onChange={(event) => set('nameKatakana', event.target.value)}
                    disabled={saving}
                />
            </FormField>

            <FormField
                group
                label="勤務地"
                required
                error={errorText('prefectures')}
                hint="エリア採用または都道府県から、1つ以上選択してください。"
            >
                <RegionSelect
                    value={values.regions}
                    onChange={(regions) => set('regions', regions)}
                    disabled={saving}
                />
            </FormField>

            <FormField
                label="企業公式サイトURL"
                required={!values.noWebsite}
                error={errorText('websiteUrl')}
            >
                <TextInput
                    type="url"
                    placeholder="https://example.com"
                    value={values.websiteUrl}
                    onChange={(event) => set('websiteUrl', event.target.value)}
                    disabled={saving || values.noWebsite}
                />
            </FormField>
            <Checkbox
                label="公式サイトはなし"
                checked={values.noWebsite}
                onChange={handleNoWebsiteChange}
                disabled={saving}
            />
        </form>
    );
}

export default CompanyForm;
