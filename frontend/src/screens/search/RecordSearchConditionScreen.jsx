import { useEffect, useState } from 'react';
import { ClipboardList, Ellipsis, MessagesSquare, Presentation, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ORDER, MATCH_MODES } from '@shared/definitions';
import { listCompanyOptions } from '@/api/companies.js';
import { listGraduationYears } from '@/api/search.js';
import Button from '@/components/Button/Button.jsx';
import DatePicker from '@/components/DatePicker/DatePicker.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import InputGroup from '@/components/InputGroup/InputGroup.jsx';
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

const TYPE_ICONS = {
    interview: MessagesSquare,
    exam: ClipboardList,
    briefing: Presentation,
    other: Ellipsis,
};

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
            <header className="record-search__header">
                <h1>過去情報検索</h1>
                <p className="record-search__lead">
                    公開済みの活動記録を検索します。条件は複数組み合わせられ、すべてに当てはまる記録が表示されます。
                </p>
            </header>

            <form className="record-search__form" onSubmit={handleSubmit} noValidate>
                <section className="record-search__group" aria-labelledby="rs-target">
                    <h2 id="rs-target" className="record-search__group-title">
                        対象
                    </h2>
                    <div className="record-search__grid">
                        <FormField label="企業名" hint="正式名称・カタカナの一部で検索できます。">
                            <InputGroup start={<Search size={16} aria-hidden="true" />}>
                                <TextInput
                                    list="record-search-companies"
                                    value={values.companyName}
                                    onChange={(event) => set('companyName', event.target.value)}
                                />
                            </InputGroup>
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

                        <FormField label="実施日（開始）" error={errorText('conductedFrom')}>
                            <DatePicker
                                value={values.conductedFrom}
                                max={values.conductedTo || undefined}
                                onChange={(value) => set('conductedFrom', value)}
                            />
                        </FormField>
                        <FormField label="実施日（終了）" error={errorText('conductedTo')}>
                            <DatePicker
                                value={values.conductedTo}
                                min={values.conductedFrom || undefined}
                                onChange={(value) => set('conductedTo', value)}
                            />
                        </FormField>
                    </div>
                </section>

                <section className="record-search__group" aria-labelledby="rs-type">
                    <h2 id="rs-type" className="record-search__group-title">
                        活動種別
                    </h2>
                    <FormField
                        group
                        label="種別"
                        hint="複数選択した場合は、いずれかに当てはまる記録を表示します。"
                    >
                        <div className="record-search__tiles">
                            {ACTIVITY_TYPE_ORDER.map((type) => {
                                const Icon = TYPE_ICONS[type];
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        className="record-search__tile"
                                        aria-pressed={values.activityTypes.includes(type)}
                                        onClick={() => toggleType(type)}
                                    >
                                        <Icon size={22} aria-hidden="true" />
                                        {ACTIVITY_TYPE_LABELS[type]}
                                    </button>
                                );
                            })}
                        </div>
                    </FormField>
                </section>

                <section className="record-search__group" aria-labelledby="rs-region">
                    <h2 id="rs-region" className="record-search__group-title">
                        勤務地
                    </h2>
                    <FormField
                        group
                        label="地域"
                        hint="複数選択した場合は、いずれかに当てはまる企業の記録を表示します。"
                    >
                        <RegionSelect
                            value={values.regions}
                            onChange={(next) => set('regions', next)}
                        />
                    </FormField>
                </section>

                <section className="record-search__group" aria-labelledby="rs-keyword">
                    <h2 id="rs-keyword" className="record-search__group-title">
                        キーワード
                    </h2>
                    <div className="record-search__grid record-search__grid--keyword">
                        <FormField
                            label="キーワード"
                            hint="質問・回答・試験内容・所感から探します。空白で区切ると、すべてを含む記録を表示します。"
                        >
                            <InputGroup start={<Search size={16} aria-hidden="true" />}>
                                <TextInput
                                    value={values.keyword}
                                    onChange={(event) => set('keyword', event.target.value)}
                                />
                            </InputGroup>
                        </FormField>
                        <FormField label="一致方法">
                            <Select
                                options={MATCH_MODE_OPTIONS}
                                value={values.matchMode}
                                onChange={(event) => set('matchMode', event.target.value)}
                            />
                        </FormField>
                    </div>
                </section>

                <div className="record-search__actions">
                    <Button type="submit">
                        <Search size={18} aria-hidden="true" />
                        検索
                    </Button>
                    <Button variant="secondary" onClick={handleClear}>
                        条件をクリア
                    </Button>
                </div>
            </form>
        </main>
    );
}

export default RecordSearchConditionScreen;
