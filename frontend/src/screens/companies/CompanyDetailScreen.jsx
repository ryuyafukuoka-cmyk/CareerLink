import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ROLES, getRegionName } from '@shared/definitions';
import { getCompany } from '@/api/companies.js';
import { useAuth } from '@/auth/useAuth.js';
import { usePageTitle } from '@/components/AppLayout/BreadcrumbContext.js';
import Button from '@/components/Button/Button.jsx';
import ExternalLink from '@/components/ExternalLink/ExternalLink.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import CompanyDeleteDialog from './CompanyDeleteDialog.jsx';
import CompanyKarteSection from './CompanyKarteSection.jsx';
import './CompanyDetailScreen.css';

const isHttpUrl = (url) => /^https?:\/\//i.test(url);

// SC-04-02 Company detail (company karte). Shows the company's current information.
// Below it, CompanyKarteSection shows the past completed records (K-01 to K-03).
function CompanyDetailScreen() {
    const { companyId } = useParams();
    const { role } = useAuth();
    const { state } = useLocation();
    const navigate = useNavigate();
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, company: null, error: null });
    const requestKey = `${companyId}|${reloadCount}`;
    const loading = result.key !== requestKey;

    useEffect(() => {
        let cancelled = false;
        getCompany(companyId)
            .then((company) => !cancelled && setResult({ key: requestKey, company, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, company: null, error }));
        return () => {
            cancelled = true;
        };
    }, [companyId, requestKey]);

    usePageTitle(result.company?.nameOfficial);

    if (loading) return <Loading centered />;

    const { company, error } = result;
    if (error) {
        return (
            <main className="company-detail">
                <ErrorMessage
                    error={error}
                    onRetry={error.status === 404 ? undefined : () => setReloadCount((n) => n + 1)}
                />
                <Link to={PATHS.companies}>企業一覧へ戻る</Link>
            </main>
        );
    }

    return (
        <main className="company-detail">
            <Link to={PATHS.companies}>← 企業一覧</Link>

            {state?.noticeId && <Notice message={getMessage(state.noticeId)} />}

            <div className="company-detail__header">
                <h1>{company.nameOfficial}</h1>
                <div className="company-detail__actions">
                    <Button
                        variant="secondary"
                        onClick={() => navigate(generatePath(PATHS.companyEdit, { companyId }))}
                    >
                        編集
                    </Button>
                    {role === ROLES.ADMIN && (
                        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                            削除
                        </Button>
                    )}
                </div>
            </div>

            <section className="company-detail__section" aria-labelledby="company-info-heading">
                <h2 id="company-info-heading">企業の基本情報（現在の情報）</h2>
                <dl className="company-detail__info">
                    <dt>企業名（正式名称）</dt>
                    <dd>{company.nameOfficial}</dd>
                    <dt>企業名（カタカナ）</dt>
                    <dd>{company.nameKatakana}</dd>
                    <dt>勤務地</dt>
                    <dd>{company.prefectures.map(getRegionName).join('、')}</dd>
                    <dt>公式サイト</dt>
                    <dd>
                        {company.websiteUrl && isHttpUrl(company.websiteUrl) ? (
                            <ExternalLink href={company.websiteUrl} />
                        ) : (
                            'なし'
                        )}
                    </dd>
                </dl>
            </section>

            <section className="company-detail__section" aria-labelledby="company-karte-heading">
                <h2 id="company-karte-heading">過去の活動記録（企業別カルテ）</h2>
                <CompanyKarteSection companyId={companyId} />
            </section>

            {deleteOpen && (
                <CompanyDeleteDialog
                    company={company}
                    onClose={() => setDeleteOpen(false)}
                    onDeleted={() =>
                        navigate(PATHS.companies, { replace: true, state: { noticeId: 'S-103' } })
                    }
                />
            )}
        </main>
    );
}

export default CompanyDetailScreen;
