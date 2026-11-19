import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation, useSearchParams } from 'react-router-dom';
import { ACTIVITY_TYPE_LABELS } from '@shared/definitions';
import { searchActivityRecords } from '@/api/search.js';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Pagination from '@/components/Pagination/Pagination.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { displayDate } from '../rounds/roundHelpers.js';
import './RecordSearch.css';

const typesText = (types) => types.map((type) => ACTIVITY_TYPE_LABELS[type]).join('、');

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

    const loading = result.key !== requestKey;
    const { data, error } = loading ? { data: null, error: null } : result;

    return (
        <main className="record-search">
            <div className="record-search__header">
                <h1>検索結果</h1>
                <Link to={changePath}>条件を変更する</Link>
            </div>

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
                    <p className="record-search__count">
                        {data.totalCount}件の記録が見つかりました。
                    </p>
                    <div className="record-search__table-wrap">
                        <table className="record-search__table">
                            <thead>
                                <tr>
                                    <th scope="col">企業名</th>
                                    <th scope="col">活動種別</th>
                                    <th scope="col">実施日</th>
                                    <th scope="col">卒業年度</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item) => (
                                    <tr key={item.recordId}>
                                        <td>
                                            <Link
                                                to={generatePath(PATHS.searchRecordDetail, {
                                                    recordId: item.recordId,
                                                })}
                                                state={{ backTo: `${pathname}${search}` }}
                                            >
                                                {item.companyName}
                                            </Link>
                                        </td>
                                        <td>{typesText(item.activityTypes)}</td>
                                        <td>{displayDate(item.conductedOn)}</td>
                                        <td>{item.graduationYear}年度</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
