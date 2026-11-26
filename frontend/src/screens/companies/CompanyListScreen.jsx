import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation, useSearchParams } from 'react-router-dom';
import { getRegionName } from '@shared/definitions';
import { listCompanies } from '@/api/companies.js';
import Button from '@/components/Button/Button.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import Pagination from '@/components/Pagination/Pagination.jsx';
import RegionSelect from '@/components/RegionSelect/RegionSelect.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { getMessage } from '@/messages';
import { useOverlay, useOverlayResult } from '@/hooks/useOverlay.js';
import { PATHS } from '@/routes/paths.js';
import CompanyFormDialog from './CompanyFormDialog.jsx';
import './CompanyListScreen.css';

const splitRegions = (text) => (text ? text.split(',').filter(Boolean) : []);
const isHttpUrl = (url) => /^https?:\/\//i.test(url);

// SC-04-01 Company list. Search by name (keyword) and regions (OR inside, AND with the keyword).
// The searched conditions and the page live in the URL, so coming back from a company keeps them.
function CompanyListScreen() {
    const { state } = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Conditions that were searched (from the URL).
    const keyword = searchParams.get('keyword') ?? '';
    const regionsText = searchParams.get('prefectures') ?? '';
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

    // What is typed in the form (applied on submit).
    const [keywordInput, setKeywordInput] = useState(keyword);
    const [regionsInput, setRegionsInput] = useState(() => splitRegions(regionsText));

    // Result of the latest request. `key` tells which search it belongs to, so loading is derived.
    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${keyword}|${regionsText}|${page}|${reloadCount}`;
    const loading = result.key !== requestKey;

    useEffect(() => {
        let cancelled = false;
        listCompanies({ keyword, regions: splitRegions(regionsText), page })
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [keyword, regionsText, page, requestKey]);

    // SC-04-03 (create) opens over this list.
    const createForm = useOverlay('companyCreate');
    const [created, setCreated] = useState(false);
    useOverlayResult('companyCreate', () => {
        setCreated(true);
        setReloadCount((n) => n + 1);
    });

    function search(nextKeyword, nextRegions) {
        const params = {};
        if (nextKeyword.trim()) params.keyword = nextKeyword.trim();
        if (nextRegions.length > 0) params.prefectures = nextRegions.join(',');
        setCreated(false);
        setSearchParams(params); // page is dropped, so it goes back to 1
    }

    function handleSubmit(event) {
        event.preventDefault();
        search(keywordInput, regionsInput);
    }

    function handleClear() {
        setKeywordInput('');
        setRegionsInput([]);
        search('', []);
    }

    function handlePageChange(nextPage) {
        const params = Object.fromEntries(searchParams);
        params.page = String(nextPage);
        setSearchParams(params);
    }

    const { data, error } = result.key === requestKey ? result : { data: null, error: null };

    return (
        <main className="company-list">
            <div className="company-list__header">
                <h1>企業一覧</h1>
                <Button onClick={() => createForm.open()}>企業を登録する</Button>
            </div>

            {(created || state?.noticeId) && (
                <Notice message={getMessage(created ? 'S-101' : state.noticeId)} />
            )}

            <form className="company-list__search" onSubmit={handleSubmit}>
                <FormField label="企業名" hint="正式名称・カタカナの一部で検索できます。">
                    <TextInput
                        value={keywordInput}
                        onChange={(event) => setKeywordInput(event.target.value)}
                    />
                </FormField>
                <FormField
                    group
                    label="勤務地"
                    hint="複数選択した場合は、いずれかに当てはまる企業を表示します。"
                >
                    <RegionSelect value={regionsInput} onChange={setRegionsInput} />
                </FormField>
                <div className="company-list__search-actions">
                    <Button type="submit" loadingText="検索中…" loading={loading}>
                        検索
                    </Button>
                    <Button variant="secondary" onClick={handleClear}>
                        条件をクリア
                    </Button>
                </div>
            </form>

            {loading && <Loading />}
            {error && <ErrorMessage error={error} onRetry={() => setReloadCount((n) => n + 1)} />}
            {data && data.items.length === 0 && (
                <EmptyState message={getMessage('N-004')}>
                    <Button variant="secondary" onClick={() => createForm.open()}>
                        企業を登録する
                    </Button>
                </EmptyState>
            )}
            {data && data.items.length > 0 && (
                <>
                    <div className="company-list__table-wrap">
                        <table className="company-list__table">
                            <thead>
                                <tr>
                                    <th scope="col">企業名</th>
                                    <th scope="col">勤務地</th>
                                    <th scope="col">公式サイト</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((company) => (
                                    <tr key={company.companyId}>
                                        <td>
                                            <Link
                                                to={generatePath(PATHS.companyDetail, {
                                                    companyId: company.companyId,
                                                })}
                                            >
                                                {company.nameOfficial}
                                            </Link>
                                            <div className="company-list__kana">
                                                {company.nameKatakana}
                                            </div>
                                        </td>
                                        <td>{company.prefectures.map(getRegionName).join('、')}</td>
                                        <td>
                                            {company.websiteUrl && isHttpUrl(company.websiteUrl) ? (
                                                <a
                                                    href={company.websiteUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    開く
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
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

            <CompanyFormDialog overlay={createForm} />
        </main>
    );
}

export default CompanyListScreen;
