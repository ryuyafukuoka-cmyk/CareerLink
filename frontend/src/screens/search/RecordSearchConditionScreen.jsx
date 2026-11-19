import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ORDER, MATCH_MODES } from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import { listGraduationYears } from '@/api/search.js';
import Button from '@/components/Button/Button.jsx';
import Checkbox from '@/components/Checkbox/Checkbox.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import RegionSelect from '@/components/RegionSelect/RegionSelect.jsx';
import Select from '@/components/Select/Select.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import {
    EMPTY_CONDITIONS,
    conditionsFromParams,
    paramsFromConditions,
    validateConditions,
} from './searchConditions.js';
import './RecordSearch.css';

const MATCH_MODE_OPTIONS = [
    { value: MATCH_MODES.PARTIAL, label: '部分一致' },
    { value: MATCH_MODES.EXACT, label: '単語完全一致' },
];

const FIELD_LABELS = { conductedFrom: '開始日', conductedTo: '終了日' };

// SC-03-01 Search conditions. Every condition is optional. Different conditions are ANDed;
// several values of one condition (types, regions) are ORed. Submitting opens SC-03-02 with the
// conditions in the URL. Opening this screen with a query (from "change conditions") pre-fills it.
function RecordSearchConditionScreen() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [values, setValues] = useState(() => conditionsFromParams(searchParams));
    const [errors, setErrors] = useState({});
    const [companyOptions, setCompanyOptions] = useState([]);
    const [years, setYears] = useState([]);

    // Suggestions and year list. Failing here only loses the suggestions: the form still works.
    useEffect(() => {
        let cancelled = false;
        listCompanyOptions()
            .then((data) => !cancelled && setCompanyOptions(data))
            .catch(() => {});
        listGraduationYears()
            .then((data) => !cancelled && setYears(data))
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const set = (name, value) => setValues((current) => ({ ...current, [name]: value }));

    function toggleType(type) {
        set(
            'activityTypes',
            values.activityTypes.includes(type)
                ? values.activityTypes.filter((t) => t !== type)
                : ACTIVITY_TYPE_ORDER.filter((t) => t === type || values.activityTypes.includes(t)),
        );
    }

    function errorText(field) {
        const messageId = errors[field];
        return messageId ? getMessage(messageId, { 項目名: FIELD_LABELS[field] }) : undefined;
    }

    function handleSubmit(event) {
        event.preventDefault();
        const found = validateConditions(values);
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        const query = new URLSearchParams(paramsFromConditions(values)).toString();
        navigate(`${PATHS.searchResults}${query ? `?${query}` : ''}`);
    }

    function handleClear() {
        setValues({ ...EMPTY_CONDITIONS });
        setErrors({});
    }

    const yearOptions = years.map((year) => ({ value: String(year), label: `${year}年度` }));

    return (
        <main className="record-search">
            <h1>過去情報検索</h1>
            <p className="record-search__lead">
                公開済みの活動記録を検索します。条件は複数組み合わせられ、すべてに当てはまる記録が表示されます。
            </p>

            <form className="record-search__form" onSubmit={handleSubmit} noValidate>
                <FormField label="企業名" hint="正式名称・カタカナの一部で検索できます。">
                    <TextInput
                        list="record-search-companies"
                        value={values.companyName}
                        onChange={(event) => set('companyName', event.target.value)}
                    />
                    <datalist id="record-search-companies">
                        {companyOptions.map((option) => (
                            <option key={option.companyId} value={option.nameOfficial} />
                        ))}
                    </datalist>
                </FormField>

                <FormField label="卒業年度" hint="記録した学生の卒業年度です。">
                    <Select
                        options={yearOptions}
                        placeholder="指定しない"
                        value={values.graduationYear}
                        onChange={(event) => set('graduationYear', event.target.value)}
                    />
                </FormField>

                <FormField
                    group
                    label="活動種別"
                    hint="複数選択した場合は、いずれかに当てはまる記録を表示します。"
                >
                    <div className="record-search__checks">
                        {ACTIVITY_TYPE_ORDER.map((type) => (
                            <Checkbox
                                key={type}
                                label={ACTIVITY_TYPE_LABELS[type]}
                                checked={values.activityTypes.includes(type)}
                                onChange={() => toggleType(type)}
                            />
                        ))}
                    </div>
                </FormField>

                <div className="record-search__dates">
                    <FormField label="実施日（開始）" error={errorText('conductedFrom')}>
                        <TextInput
                            placeholder="YYYY/MM/DD"
                            value={values.conductedFrom}
                            onChange={(event) => set('conductedFrom', event.target.value)}
                        />
                    </FormField>
                    <FormField label="実施日（終了）" error={errorText('conductedTo')}>
                        <TextInput
                            placeholder="YYYY/MM/DD"
                            value={values.conductedTo}
                            onChange={(event) => set('conductedTo', event.target.value)}
                        />
                    </FormField>
                </div>

                <FormField
                    group
                    label="勤務地"
                    hint="複数選択した場合は、いずれかに当てはまる企業の記録を表示します。"
                >
                    <RegionSelect
                        value={values.regions}
                        onChange={(next) => set('regions', next)}
                    />
                </FormField>

                <FormField
                    label="キーワード"
                    hint="質問・回答・試験内容・所感から探します。空白で区切ると、すべてを含む記録を表示します。"
                >
                    <TextInput
                        value={values.keyword}
                        onChange={(event) => set('keyword', event.target.value)}
                    />
                </FormField>
                <FormField label="キーワードの一致方法">
                    <Select
                        options={MATCH_MODE_OPTIONS}
                        value={values.matchMode}
                        onChange={(event) => set('matchMode', event.target.value)}
                    />
                </FormField>

                <div className="record-search__actions">
                    <Button type="submit">検索</Button>
                    <Button variant="secondary" onClick={handleClear}>
                        条件をクリア
                    </Button>
                </div>
            </form>
        </main>
    );
}

export default RecordSearchConditionScreen;
