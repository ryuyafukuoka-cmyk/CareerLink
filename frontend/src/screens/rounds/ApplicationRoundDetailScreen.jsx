import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ACTIVITY_TYPE_LABELS,
    RECORD_STATUS_LABELS,
    ROLES,
    STAGE_LABELS,
} from '@shared/definitions';
import { getCompany } from '@/api/companies.js';
import { getApplicationRound, listRoundHistory, listRoundRecords } from '@/api/rounds.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { formatDateTime } from '@/utils/date.js';
import { displayDate } from './roundHelpers.js';
import './RoundScreens.css';

// SC-02-05 Round detail: progress, records of this round (drafts only for the owner and admins) and edit history.
function ApplicationRoundDetailScreen() {
    const { roundId } = useParams();
    const { role } = useAuth();
    const { state } = useLocation();
    const navigate = useNavigate();
    const isStaff = role !== ROLES.STUDENT;
    const canWrite = role === ROLES.STUDENT || role === ROLES.ADMIN; // instructors are read-only

    const [reloadCount, setReloadCount] = useState(0);
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

    if (result.key !== requestKey) return <Loading centered />;

    const { data, error } = result;
    if (error) {
        const noRetry = error.status === 404 || error.status === 403;
        return (
            <main className="round-screen">
                <ErrorMessage
                    error={error}
                    onRetry={noRetry ? undefined : () => setReloadCount((n) => n + 1)}
                />
                <Link to={PATHS.rounds}>応募企業・選考進捗へ戻る</Link>
            </main>
        );
    }

    const { round, records, history, company, studentName } = data;
    const params = { roundId: round.applicationRoundId };

    return (
        <main className="round-screen">
            <Link to={PATHS.rounds}>← 応募企業・選考進捗</Link>

            {state?.noticeId && <Notice message={getMessage(state.noticeId)} />}

            <div className="round-screen__header">
                <h1>
                    {company ? (
                        <Link
                            to={generatePath(PATHS.companyDetail, { companyId: company.companyId })}
                        >
                            {company.nameOfficial}
                        </Link>
                    ) : (
                        `企業ID ${round.companyId}`
                    )}
                </h1>
                {canWrite && (
                    <Button onClick={() => navigate(generatePath(PATHS.roundEdit, params))}>
                        選考進捗を編集
                    </Button>
                )}
            </div>

            <dl className="round-screen__info">
                {studentName && (
                    <>
                        <dt>学生</dt>
                        <dd>{studentName}</dd>
                    </>
                )}
                <dt>選考段階</dt>
                <dd>{STAGE_LABELS[round.stage]}</dd>
                <dt>応募日</dt>
                <dd>{displayDate(round.applicationDate)}</dd>
                <dt>選考状況</dt>
                <dd className="round-screen__note">{round.statusNote || '—'}</dd>
            </dl>

            <section className="round-screen__group">
                <div className="round-screen__header">
                    <h2>活動記録</h2>
                    {canWrite && (
                        <Button
                            variant="secondary"
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
                            この応募回に活動記録を追加
                        </Button>
                    )}
                </div>
                {records.length === 0 ? (
                    <EmptyState message={getMessage('N-006')} />
                ) : (
                    <div className="round-screen__table-wrap">
                        <table className="round-screen__table">
                            <thead>
                                <tr>
                                    <th scope="col">実施日</th>
                                    <th scope="col">活動種別</th>
                                    <th scope="col">状態</th>
                                    <th scope="col">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.recordId}>
                                        <td>{displayDate(record.conductedOn)}</td>
                                        <td>
                                            {record.activityTypes
                                                .map((type) => ACTIVITY_TYPE_LABELS[type])
                                                .join('、')}
                                        </td>
                                        <td>{RECORD_STATUS_LABELS[record.status]}</td>
                                        <td>
                                            <Link
                                                to={generatePath(PATHS.recordDetail, {
                                                    recordId: record.recordId,
                                                })}
                                            >
                                                詳細
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="round-screen__group">
                <h2>更新履歴</h2>
                {history.length === 0 ? (
                    <EmptyState message={getMessage('N-006')} />
                ) : (
                    <ul className="round-screen__history">
                        {history.map((item) => (
                            <li key={`${item.editorUserId}|${item.editedAt}`}>
                                {formatDateTime(item.editedAt)} {item.editorName}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

export default ApplicationRoundDetailScreen;
