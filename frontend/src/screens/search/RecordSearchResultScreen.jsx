import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { generatePath, useLocation, useSearchParams } from 'react-router-dom';
import { ACTIVITY_TYPE_LABELS, getRegionName } from '@shared/definitions';
import { searchActivityRecords } from '@/api/search.js';
import AnimatedNumber from '@/components/AnimatedNumber/AnimatedNumber.jsx';
import Badge from '@/components/Badge/Badge.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Pagination from '@/components/Pagination/Pagination.jsx';
import TextLink from '@/components/TextLink/TextLink.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { displayDate } from '../rounds/roundHelpers.js';
import './RecordSearch.css';

const splitList = (text) => (text ? text.split(',').filter(Boolean) : []);

// Applied conditions as removable chips. `remove` is the query param(s) a chip clears.
function buildChips(params) {
    const chips = [];
    const add = (id, label, keys, value) => chips.push({ id, label, keys, value });
    if (params.get('companyName'))
        add('company', `企業「${params.get('companyName')}」`, ['companyName']);
    if (params.get('graduationYear'))
        add('year', `${params.get('graduationYear')}年度`, ['graduationYear']);
    splitList(params.get('activityTypes')).forEach((type) =>
        add(`type-${type}`, ACTIVITY_TYPE_LABELS[type] ?? type, ['activityTypes'], type),
    );
    const from = params.get('conductedFrom');
    const to = params.get('conductedTo');
    if (from || to)
        add('period', `${from || '…'} 〜 ${to || '…'}`, ['conductedFrom', 'conductedTo']);
    splitList(params.get('prefectures')).forEach((id) =>
        add(`region-${id}`, getRegionName(id), ['prefectures'], id),
    );
    if (params.get('keyword')) {
        const mode = params.get('matchMode') === 'exact' ? '（単語完全一致）' : '';
        add('keyword', `「${params.get('keyword')}」${mode}`, ['keyword', 'matchMode']);
    }
    return chips;
}

// SC-03-02 Search results. The conditions and the page are in the URL (set by SC-03-01), so
// going to a record and coming back keeps both. Only summaries are shown: no names, no excerpts.
function RecordSearchResultScreen() {
    const { pathname, search } = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${search}|${reloadCount}`;

    useEffect(() => {
        let cancelled = false;
        // `prefectures` and the other names are sent exactly as they are in the URL.
        searchActivityRecords(Object.fromEntries(new URLSearchParams(search)))
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [search, requestKey]);

    function handlePageChange(nextPage) {
        const params = Object.fromEntries(searchParams);
        params.page = String(nextPage);
        setSearchParams(params);
    }

    // Same conditions without the page, so SC-03-01 opens pre-filled.
    const conditionParams = new URLSearchParams(searchParams);
    conditionParams.delete('page');
    const conditionQuery = conditionParams.toString();
    const changePath = `${PATHS.search}${conditionQuery ? `?${conditionQuery}` : ''}`;

    // Removing a chip searches again right away; the page goes back to 1.
    function removeChip(chip) {
        const params = new URLSearchParams(searchParams);
        params.delete('page');
        if (chip.value !== undefined) {
            const rest = splitList(params.get(chip.keys[0])).filter((v) => v !== chip.value);
            if (rest.length > 0) params.set(chip.keys[0], rest.join(','));
            else params.delete(chip.keys[0]);
        } else {
            chip.keys.forEach((key) => params.delete(key));
        }
        setSearchParams(params);
    }

    const chips = buildChips(searchParams);
    const loading = result.key !== requestKey;
    const { data, error } = loading ? { data: null, error: null } : result;

    return (
        <main className="record-search">
            <div className="record-search__top">
                <h1>検索結果</h1>
                <TextLink to={changePath} className="record-search__change">
                    <SlidersHorizontal size={16} aria-hidden="true" />
                    条件を変更する
                </TextLink>
            </div>

            {(data || chips.length > 0) && (
                <div className="record-search__summary">
                    {data && (
                        <p className="record-search__count" role="status">
                            <AnimatedNumber
                                className="record-search__count-value"
                                value={data.totalCount}
                            />
                            件
                        </p>
                    )}
                    {chips.length > 0 && (
                        <ul className="record-search__chips" aria-label="検索中の条件">
                            {chips.map((chip) => (
                                <li key={chip.id}>
                                    <button
                                        type="button"
                                        className="record-search__chip"
                                        onClick={() => removeChip(chip)}
                                        aria-label={`${chip.label}の条件を外す`}
                                    >
                                        {chip.label}
                                        <X size={14} aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {loading && <Loading />}
            {error && (
                <ErrorMessage
                    error={error}
                    onRetry={error.status === 400 ? undefined : () => setReloadCount((n) => n + 1)}
                />
            )}
            {data && data.items.length === 0 && <EmptyState message={getMessage('N-003')} />}
            {data && data.items.length > 0 && (
                <>
                    <ul className="record-search__items">
                        {data.items.map((item) => (
                            <li key={item.recordId} className="record-search__item">
                                <TextLink
                                    className="record-search__link"
                                    to={generatePath(PATHS.searchRecordDetail, {
                                        recordId: item.recordId,
                                    })}
                                    state={{ backTo: `${pathname}${search}` }}
                                >
                                    {item.companyName}
                                </TextLink>
                                <ul className="record-search__types" aria-label="活動種別">
                                    {item.activityTypes.map((type) => (
                                        <li key={type}>
                                            <Badge size="sm" tone="primary">
                                                {ACTIVITY_TYPE_LABELS[type]}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                                <span className="record-search__meta">
                                    {displayDate(item.conductedOn)}
                                </span>
                                <span className="record-search__meta">
                                    {item.graduationYear}年度
                                </span>
                            </li>
                        ))}
                    </ul>
                    <Pagination
                        page={data.page}
                        totalCount={data.totalCount}
                        pageSize={data.pageSize}
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </main>
    );
}

export default RecordSearchResultScreen;
