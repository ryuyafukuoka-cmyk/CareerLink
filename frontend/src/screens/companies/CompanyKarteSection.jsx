import { useEffect, useState } from 'react';
import { Link, generatePath } from 'react-router-dom';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ORDER } from '@shared/definitions';
import { getCompanyKarte, listCompanyExamInfo, listCompanyInterviewInfo } from '@/api/karte.js';
import { listGraduationYears } from '@/api/search.js';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Select from '@/components/Select/Select.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { classNames } from '@/utils/classNames.js';
import { displayDate } from '../rounds/roundHelpers.js';
import './CompanyKarteSection.css';

const TABS = [
    { id: 'records', label: '活動記録', load: getCompanyKarte },
    { id: 'interview', label: '面接情報', load: listCompanyInterviewInfo },
    { id: 'exam', label: '試験情報', load: listCompanyExamInfo },
];

const typesText = (types) => types.map((type) => ACTIVITY_TYPE_LABELS[type]).join('、');
const recordPath = (recordId) => generatePath(PATHS.recordDetail, { recordId });

// Records grouped by graduation year (newest first). Poster names only when the API sends them.
function RecordsView({ years }) {
    return years.map((group) => (
        <section key={group.graduationYear} className="company-karte__year">
            <h3>{group.graduationYear}年度</h3>
            <ul className="company-karte__list">
                {group.records.map((record) => (
                    <li key={record.recordId} className="company-karte__item">
                        <Link to={recordPath(record.recordId)}>
                            {displayDate(record.conductedOn)} {typesText(record.activityTypes)}
                        </Link>
                        {record.posterName && (
                            <span className="company-karte__meta">投稿者：{record.posterName}</span>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    ));
}

// Interview questions asked (category, question, follow-ups). Answers are never included.
function InterviewView({ items }) {
    return (
        <ul className="company-karte__list">
            {items.map((item, index) => (
                <li key={`${item.recordId}-${index}`} className="company-karte__item">
                    <p className="company-karte__meta">
                        {item.graduationYear}年度・{displayDate(item.conductedOn)}・
                        {item.category ?? 'カテゴリ未設定'}
                    </p>
                    <p>{item.content}</p>
                    {item.followUps.length > 0 && (
                        <ul className="company-karte__followups">
                            {item.followUps.map((followUp, i) => (
                                <li key={i}>深掘り：{followUp}</li>
                            ))}
                        </ul>
                    )}
                    <Link to={recordPath(item.recordId)}>記録を見る</Link>
                </li>
            ))}
        </ul>
    );
}

// Exams (name / format, content, preparation).
function ExamView({ items }) {
    return (
        <ul className="company-karte__list">
            {items.map((item) => (
                <li key={item.recordId} className="company-karte__item">
                    <p className="company-karte__meta">
                        {item.graduationYear}年度・{displayDate(item.conductedOn)}
                    </p>
                    <p>
                        <strong>{item.nameFormat}</strong>
                    </p>
                    <p>出題内容：{item.content}</p>
                    {item.preparation && <p>対策：{item.preparation}</p>}
                    <Link to={recordPath(item.recordId)}>記録を見る</Link>
                </li>
            ))}
        </ul>
    );
}

// Karte part of SC-04-02: past completed records of one company. Three tabs (records, interview
// info, exam info) share a graduation-year filter and an activity-type filter.
function CompanyKarteSection({ companyId }) {
    const [tabId, setTabId] = useState('records');
    const [year, setYear] = useState('');
    const [activityType, setActivityType] = useState('');
    const [years, setYears] = useState([]);

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${companyId}|${tabId}|${year}|${activityType}|${reloadCount}`;
    const loading = result.key !== requestKey;

    // Year choices: every year that has completed records (S-03). Without them the filter just stays empty.
    useEffect(() => {
        let cancelled = false;
        listGraduationYears()
            .then((data) => !cancelled && setYears(data))
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const filter = {
            graduationYear: year || undefined,
            activityType: activityType || undefined,
        };
        TABS.find((tab) => tab.id === tabId)
            .load(companyId, filter)
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [companyId, tabId, year, activityType, requestKey]);

    const { data, error } = loading ? { data: null, error: null } : result;
    const isEmpty = data && (tabId === 'records' ? data.years.length === 0 : data.length === 0);

    return (
        <div className="company-karte">
            <div className="company-karte__filters">
                <FormField label="卒業年度">
                    <Select
                        options={years.map((y) => ({ value: String(y), label: `${y}年度` }))}
                        placeholder="すべて"
                        value={year}
                        onChange={(event) => setYear(event.target.value)}
                    />
                </FormField>
                <FormField label="活動種別">
                    <Select
                        options={ACTIVITY_TYPE_ORDER.map((type) => ({
                            value: type,
                            label: ACTIVITY_TYPE_LABELS[type],
                        }))}
                        placeholder="すべて"
                        value={activityType}
                        onChange={(event) => setActivityType(event.target.value)}
                    />
                </FormField>
            </div>

            <div className="company-karte__tabs" role="tablist" aria-label="企業別カルテ">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={tab.id === tabId}
                        className={classNames(
                            'company-karte__tab',
                            tab.id === tabId && 'company-karte__tab--current',
                        )}
                        onClick={() => setTabId(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <p className="company-karte__note">{getMessage('N-002')}</p>

            {loading && <Loading />}
            {error && (
                <ErrorMessage
                    error={error}
                    onRetry={error.status === 400 ? undefined : () => setReloadCount((n) => n + 1)}
                />
            )}
            {isEmpty && <EmptyState message={getMessage('N-005')} />}
            {data && !isEmpty && tabId === 'records' && <RecordsView years={data.years} />}
            {data && !isEmpty && tabId === 'interview' && <InterviewView items={data} />}
            {data && !isEmpty && tabId === 'exam' && <ExamView items={data} />}
        </div>
    );
}

export default CompanyKarteSection;
