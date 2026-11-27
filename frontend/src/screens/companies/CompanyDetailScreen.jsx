import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ROLES, getRegionName } from '@shared/definitions';
import { getCompany } from '@/api/companies.js';
import { useAuth } from '@/auth/useAuth.js';
import { usePageTitle } from '@/components/AppLayout/BreadcrumbContext.js';
import Badge from '@/components/Badge/Badge.jsx';
import Button from '@/components/Button/Button.jsx';
import ExternalLink from '@/components/ExternalLink/ExternalLink.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import TextLink from '@/components/TextLink/TextLink.jsx';
import { getMessage } from '@/messages';
import { useOverlay, useOverlayResult } from '@/hooks/useOverlay.js';
import { PATHS } from '@/routes/paths.js';
import CompanyDeleteDialog from './CompanyDeleteDialog.jsx';
import CompanyFormDialog from './CompanyFormDialog.jsx';
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
    // Reloading the same company (after an edit) keeps it on screen until the new data arrives.
    const reloading = Boolean(result.company) && result.key?.startsWith(`${companyId}|`);
    const loading = result.key !== requestKey && !reloading;

    // SC-04-03 (edit) opens over this page.
    const editForm = useOverlay('companyEdit');
    const [updatedId, setUpdatedId] = useState(null);
    useOverlayResult('companyEdit', (saved) => {
        setUpdatedId(saved.companyId);
        setReloadCount((n) => n + 1);
    });

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
                <TextLink to={PATHS.companies}>企業一覧へ戻る</TextLink>
            </main>
        );
    }

    return (
        <main className="company-detail">
            {updatedId === company.companyId ? (
                <Notice message={getMessage('S-102')} />
            ) : (
                state?.noticeId && <Notice message={getMessage(state.noticeId)} />
            )}

            {/* Current information of the company (the records below keep their own time). */}
            <header className="company-detail__profile">
                <div className="company-detail__header">
                    <div className="company-detail__name">
                        <h1>{company.nameOfficial}</h1>
                        {/* Shown above the name, like furigana (column-reverse). */}
                        <p className="company-detail__kana">{company.nameKatakana}</p>
                    </div>
                    <div className="company-detail__actions">
                        <Button variant="secondary" onClick={() => editForm.open()}>
                            <Pencil size={16} aria-hidden="true" />
                            編集
                        </Button>
                        {role === ROLES.ADMIN && (
                            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                                <Trash2 size={16} aria-hidden="true" />
                                削除
                            </Button>
                        )}
                    </div>
                </div>

                <dl className="company-detail__info">
                    <dt>勤務地</dt>
                    <dd>
                        <ul className="company-detail__regions">
                            {company.prefectures.map((id) => (
                                <li key={id}>
                                    <Badge size="sm">{getRegionName(id)}</Badge>
                                </li>
                            ))}
                        </ul>
                    </dd>
                    <dt>公式サイト</dt>
                    <dd>
                        {company.websiteUrl && isHttpUrl(company.websiteUrl) ? (
                            <ExternalLink href={company.websiteUrl} />
                        ) : (
                            'なし'
                        )}
                    </dd>
                </dl>
            </header>

            <section className="company-detail__section" aria-labelledby="company-karte-heading">
                <h2 id="company-karte-heading">過去の活動記録（企業別カルテ）</h2>
                <CompanyKarteSection companyId={companyId} />
            </section>

            <CompanyFormDialog overlay={editForm} company={company} />

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
