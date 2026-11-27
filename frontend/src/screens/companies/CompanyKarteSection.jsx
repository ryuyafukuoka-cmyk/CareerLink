import { useEffect, useState } from 'react';
import { generatePath } from 'react-router-dom';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ORDER } from '@shared/definitions';
import { getCompanyKarte, listCompanyExamInfo, listCompanyInterviewInfo } from '@/api/karte.js';
import { listGraduationYears } from '@/api/search.js';
import Badge from '@/components/Badge/Badge.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Select from '@/components/Select/Select.jsx';
import Tabs from '@/components/Tabs/Tabs.jsx';
import TextLink from '@/components/TextLink/TextLink.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { displayDate } from '../rounds/roundHelpers.js';
import './CompanyKarteSection.css';

const TABS = [
    { id: 'records', label: '活動記録', load: getCompanyKarte },
    { id: 'interview', label: '面接情報', load: listCompanyInterviewInfo },
    { id: 'exam', label: '試験情報', load: listCompanyExamInfo },
];

const recordPath = (recordId) => generatePath(PATHS.recordDetail, { recordId });

// Records grouped by graduation year (newest first). Poster names only when the API sends them.
function RecordsView({ years }) {
    return years.map((group) => (
        <section key={group.graduationYear} className="company-karte__year">
            <h3 className="company-karte__year-title">{group.graduationYear}年度</h3>
            <ul className="company-karte__list">
                {group.records.map((record) => (
                    <li key={record.recordId} className="company-karte__record">
                        <TextLink to={recordPath(record.recordId)}>
                            {displayDate(record.conductedOn)}
                        </TextLink>
                        <span className="company-karte__types">
                            {record.activityTypes.map((type) => (
                                <Badge key={type} size="sm">
                                    {ACTIVITY_TYPE_LABELS[type]}
                                </Badge>
                            ))}
                        </span>
                        {record.posterName && (
                            <span className="company-karte__meta">投稿者：{record.posterName}</span>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    ));
}

// When it happened, plus a link to the whole record.
function ItemFooter({ item }) {
    return (
        <p className="company-karte__footer">
            <span className="company-karte__meta">
                {item.graduationYear}年度・{displayDate(item.conductedOn)}
            </span>
            <TextLink to={recordPath(item.recordId)}>記録を見る</TextLink>
        </p>
    );
}

// Interview questions asked (category, question, follow-ups). Answers are never included.
function InterviewView({ items }) {
    return (
        <ul className="company-karte__list company-karte__cards">
            {items.map((item, index) => (
                <li key={`${item.recordId}-${index}`} className="company-karte__item">
                    <p>
                        <Badge size="sm" tone={item.category ? 'primary' : 'neutral'}>
                            {item.category ?? 'カテゴリ未設定'}
                        </Badge>
                    </p>
                    <p className="company-karte__question">{item.content}</p>
                    {item.followUps.length > 0 && (
                        <ul className="company-karte__followups" aria-label="深掘り質問">
                            {item.followUps.map((followUp, i) => (
                                <li key={i}>{followUp}</li>
                            ))}
                        </ul>
                    )}
                    <ItemFooter item={item} />
                </li>
            ))}
        </ul>
    );
}

// Exams (name / format, content, preparation).
function ExamView({ items }) {
    return (
        <ul className="company-karte__list company-karte__cards">
            {items.map((item) => (
                <li key={item.recordId} className="company-karte__item">
                    <p className="company-karte__question">{item.nameFormat}</p>
                    <dl className="company-karte__exam">
                        <dt>出題内容</dt>
                        <dd>{item.content}</dd>
                        {item.preparation && (
                            <>
                                <dt>対策</dt>
                                <dd>{item.preparation}</dd>
                            </>
                        )}
                    </dl>
                    <ItemFooter item={item} />
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

    // Only the open tab is rendered, so every tab gets the same panel.
    const panel = (
        <div className="company-karte__panel">
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

            <Tabs
                label="企業別カルテ"
                items={TABS.map((tab) => ({ value: tab.id, label: tab.label, content: panel }))}
                value={tabId}
                onChange={setTabId}
            />
        </div>
    );
}

export default CompanyKarteSection;
