import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ACTIVITY_TYPE_LABELS, ROLES } from '@shared/definitions';
import { getCompany } from '@/api/companies.js';
import { getApplicationRound, listRoundHistory, listRoundRecords } from '@/api/rounds.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import { usePageTitle } from '@/components/AppLayout/BreadcrumbContext.js';
import Badge from '@/components/Badge/Badge.jsx';
import Button from '@/components/Button/Button.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import StageTracker from '@/components/StageTracker/StageTracker.jsx';
import StatusMark from '@/components/StatusMark/StatusMark.jsx';
import TextLink from '@/components/TextLink/TextLink.jsx';
import { toast } from '@/components/Toast/toast.js';
import { useOverlay, useOverlayResult } from '@/hooks/useOverlay.js';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { formatDateTime } from '@/utils/date.js';
import RoundEditDialog from './RoundEditDialog.jsx';
import { displayDate } from './roundHelpers.js';
import './RoundScreens.css';

// SC-02-05 Round detail: progress, records of this round (drafts only for the owner and admins) and edit history.
function ApplicationRoundDetailScreen() {
    const { roundId } = useParams();
    const { role } = useAuth();
    const navigate = useNavigate();
    const isStaff = role !== ROLES.STUDENT;
    const canWrite = role === ROLES.STUDENT || role === ROLES.ADMIN; // instructors are read-only

    // SC-02-07 opens over this page; after a save the page is read again.
    const editForm = useOverlay('roundEdit');
    const [reloadCount, setReloadCount] = useState(0);
    useOverlayResult('roundEdit', () => {
        toast.success(getMessage('S-301'));
        setReloadCount((n) => n + 1);
    });

    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${roundId}|${role}|${reloadCount}`;

    useEffect(() => {
        let cancelled = false;
        async function load() {
            const [round, records, history, students] = await Promise.all([
                getApplicationRound(roundId),
                listRoundRecords(roundId),
                listRoundHistory(roundId),
                isStaff ? listUsers({ role: ROLES.STUDENT }) : Promise.resolve([]),
            ]);
            const company = await getCompany(round.companyId).catch(() => null);
            const student = students.find((s) => s.userId === round.studentUserId);
            return {
                round,
                records,
                history,
                company,
                studentName: student?.displayName ?? null,
            };
        }
        load()
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [roundId, isStaff, requestKey]);

    usePageTitle(result.data?.company?.nameOfficial);

    // Keep showing the page while it is read again after a save, so the dialog can close smoothly.
    if (result.key === null) return <Loading centered />;

    const { data, error } = result;
    if (error) {
        const noRetry = error.status === 404 || error.status === 403;
        return (
            <main className="round-screen">
                <ErrorMessage
                    error={error}
                    onRetry={noRetry ? undefined : () => setReloadCount((n) => n + 1)}
                />
                <TextLink to={PATHS.rounds}>応募企業・選考進捗へ戻る</TextLink>
            </main>
        );
    }

    const { round, records, history, company, studentName } = data;

    return (
        <main className="round-screen">
            <header className="round-hero">
                <div className="round-screen__header">
                    <div>
                        <h1>
                            {company ? (
                                <TextLink
                                    to={generatePath(PATHS.companyDetail, {
                                        companyId: company.companyId,
                                    })}
                                >
                                    {company.nameOfficial}
                                </TextLink>
                            ) : (
                                `企業ID ${round.companyId}`
                            )}
                        </h1>
                        <p className="round-hero__meta">
                            {studentName && <span>{studentName}</span>}
                            <span>応募日 {displayDate(round.applicationDate)}</span>
                        </p>
                    </div>
                    {canWrite && (
                        <Button
                            className="round-screen__new"
                            onClick={() =>
                                editForm.open({
                                    round,
                                    companyName: company?.nameOfficial ?? null,
                                })
                            }
                        >
                            <Pencil size={16} aria-hidden="true" />
                            選考進捗を編集
                        </Button>
                    )}
                </div>
                <StageTracker stage={round.stage} />
                <dl className="round-hero__note">
                    <dt>選考状況</dt>
                    <dd className="round-screen__note">{round.statusNote || '—'}</dd>
                </dl>
            </header>

            <section className="round-screen__group">
                <div className="round-screen__header">
                    <h2>活動記録</h2>
                    {canWrite && (
                        <Button
                            variant="secondary"
                            className="round-screen__new"
                            onClick={() =>
                                navigate(PATHS.recordNew, {
                                    state: {
                                        applicationRoundId: round.applicationRoundId,
                                        companyId: round.companyId,
                                        studentUserId: round.studentUserId,
                                    },
                                })
                            }
                        >
                            <Plus size={16} aria-hidden="true" />
                            この応募回に活動記録を追加
                        </Button>
                    )}
                </div>
                {records.length === 0 ? (
                    <EmptyState message={getMessage('N-006')} />
                ) : (
                    <ul className="round-records">
                        {records.map((record) => (
                            <li key={record.recordId} className="round-records__item">
                                <TextLink
                                    to={generatePath(PATHS.recordDetail, {
                                        recordId: record.recordId,
                                    })}
                                >
                                    {displayDate(record.conductedOn)}の記録
                                </TextLink>
                                <span className="round-records__types">
                                    {record.activityTypes.map((type) => (
                                        <Badge key={type} size="sm">
                                            {ACTIVITY_TYPE_LABELS[type]}
                                        </Badge>
                                    ))}
                                </span>
                                <StatusMark status={record.status} size="sm" />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="round-screen__group">
                <h2>更新履歴</h2>
                {history.length === 0 ? (
                    <EmptyState message={getMessage('N-006')} />
                ) : (
                    <ul className="timeline">
                        {history.map((item) => (
                            <li key={`${item.editorUserId}|${item.editedAt}`}>
                                {formatDateTime(item.editedAt)} {item.editorName}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <RoundEditDialog overlay={editForm} />
        </main>
    );
}

export default ApplicationRoundDetailScreen;
