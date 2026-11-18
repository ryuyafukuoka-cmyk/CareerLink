import { useEffect, useRef, useState } from 'react';
import { Link, generatePath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createCompany, getCompany, updateCompany } from '@/api/companies.js';
import Button from '@/components/Button/Button.jsx';
import Checkbox from '@/components/Checkbox/Checkbox.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import RegionSelect from '@/components/RegionSelect/RegionSelect.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { getErrorMessage, getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { validateCompany } from './validateCompany.js';
import './CompanyFormScreen.css';

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

// The form itself. `company` is the company being edited, or null for a new one.
function CompanyForm({ company }) {
    const navigate = useNavigate();
    const { state: locationState } = useLocation();
    const isEdit = company !== null;
    const [values, setValues] = useState({
        nameOfficial: company?.nameOfficial ?? '',
        nameKatakana: company?.nameKatakana ?? '',
        regions: company?.prefectures ?? [],
        websiteUrl: company?.websiteUrl ?? '',
        noWebsite: isEdit && company.websiteUrl === null,
    });
    const [errors, setErrors] = useState({}); // { field: messageId }
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

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
            // Opened from the record form: go back to it with the new company selected.
            if (!isEdit && locationState?.returnTo) {
                navigate(locationState.returnTo, {
                    replace: true,
                    state: { ...locationState.returnState, newCompanyId: saved.companyId },
                });
                return;
            }
            navigate(generatePath(PATHS.companyDetail, { companyId: saved.companyId }), {
                replace: true,
                state: { noticeId: isEdit ? 'S-102' : 'S-101' },
            });
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

    let cancelPath = PATHS.companies;
    if (isEdit) cancelPath = generatePath(PATHS.companyDetail, { companyId: company.companyId });
    else if (locationState?.returnTo) cancelPath = locationState.returnTo;

    return (
        <form ref={formRef} className="company-form__card" onSubmit={handleSubmit} noValidate>
            {formError && <ErrorMessage message={formError} />}

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

            <div className="company-form__actions">
                <Button variant="secondary" disabled={saving} onClick={() => navigate(cancelPath)}>
                    キャンセル
                </Button>
                <Button type="submit" loading={saving}>
                    {isEdit ? '更新する' : '登録する'}
                </Button>
            </div>
        </form>
    );
}

// SC-04-03 Company form: create (/companies/new) and edit (/companies/:companyId/edit).
function CompanyFormScreen() {
    const { companyId } = useParams();
    const isEdit = Boolean(companyId);

    // Edit mode: load the company first. `key` says which company the result belongs to.
    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, company: null, error: null });
    const requestKey = `${companyId}|${reloadCount}`;
    const loading = isEdit && result.key !== requestKey;

    useEffect(() => {
        if (!companyId) return undefined;
        let cancelled = false;
        getCompany(companyId)
            .then((company) => !cancelled && setResult({ key: requestKey, company, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, company: null, error }));
        return () => {
            cancelled = true;
        };
    }, [companyId, requestKey]);

    const loaded = result.key === requestKey ? result : { company: null, error: null };

    return (
        <main className="company-form">
            <h1>{isEdit ? '企業情報の編集' : '企業の登録'}</h1>
            {loading && <Loading />}
            {isEdit && loaded.error && (
                <>
                    <ErrorMessage
                        error={loaded.error}
                        onRetry={
                            loaded.error.status === 404
                                ? undefined
                                : () => setReloadCount((n) => n + 1)
                        }
                    />
                    <Link to={PATHS.companies}>企業一覧へ戻る</Link>
                </>
            )}
            {!isEdit && <CompanyForm key="new" company={null} />}
            {loaded.company && (
                <CompanyForm key={loaded.company.companyId} company={loaded.company} />
            )}
        </main>
    );
}

export default CompanyFormScreen;
