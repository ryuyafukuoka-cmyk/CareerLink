import { useEffect, useState } from 'react';
import { Link, generatePath, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ACTIVITY_TYPE_LABELS,
    RECORD_STATUSES,
    RECORD_STATUS_LABELS,
    ROLES,
} from '@shared/definitions';
import { listDrafts, listMyActivityRecords } from '@/api/records.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import Select from '@/components/Select/Select.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { formatDateTime } from '@/utils/date.js';
import { displayDate, studentOptions } from '../rounds/roundHelpers.js';
import '../rounds/RoundScreens.css';
import './RecordScreens.css';

const typesText = (types) => types.map((type) => ACTIVITY_TYPE_LABELS[type]).join('、');

// One table of record summaries. showUpdatedAt is for drafts (sorted by last update).
function RecordTable({ records, showUpdatedAt = false, canWrite }) {
    return (
        <div className="round-screen__table-wrap">
            <table className="round-screen__table">
                <thead>
                    <tr>
                        <th scope="col">企業名</th>
                        <th scope="col">活動種別</th>
                        <th scope="col">実施日</th>
                        {showUpdatedAt && <th scope="col">最終更新</th>}
                        <th scope="col">状態</th>
                        <th scope="col">操作</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => {
                        const params = { recordId: record.recordId };
                        return (
                            <tr key={record.recordId}>
                                <td>{record.companyName}</td>
                                <td>{typesText(record.activityTypes)}</td>
                                <td>{displayDate(record.conductedOn)}</td>
                                {showUpdatedAt && <td>{formatDateTime(record.updatedAt)}</td>}
                                <td>{RECORD_STATUS_LABELS[record.status]}</td>
                                <td>
                                    <span className="round-screen__links">
                                        <Link to={generatePath(PATHS.recordDetail, params)}>
                                            詳細
                                        </Link>
                                        {canWrite && (
                                            <Link to={generatePath(PATHS.recordEdit, params)}>
                                                編集
                                            </Link>
                                        )}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// SC-02-01 Activity record list.
// Own records are shown in two separate groups: drafts (last update, newest first) and published (date, newest first).
// Admins also see drafts of all students, or of one chosen student (kept in the URL).
function RecordListScreen() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { role } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const isAdmin = role === ROLES.ADMIN;
    const canWrite = role === ROLES.STUDENT || isAdmin; // instructors are read-only
    const studentUserId = isAdmin ? (searchParams.get('studentUserId') ?? '') : '';

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${role}|${studentUserId}|${reloadCount}`;

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            listMyActivityRecords(),
            isAdmin ? listDrafts({ userId: studentUserId || undefined }) : Promise.resolve([]),
            isAdmin ? listUsers({ role: ROLES.STUDENT }) : Promise.resolve([]),
        ])
            .then(([mine, studentDrafts, students]) => {
                if (!cancelled) {
                    setResult({
                        key: requestKey,
                        data: { mine, studentDrafts, students },
                        error: null,
                    });
                }
            })
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [isAdmin, studentUserId, requestKey]);

    if (result.key !== requestKey) return <Loading centered />;

    const { data, error } = result;
    if (error) {
        return (
            <main className="round-screen">
                <h1>活動記録</h1>
                <ErrorMessage error={error} onRetry={() => setReloadCount((n) => n + 1)} />
            </main>
        );
    }

    const drafts = data.mine.filter((record) => record.status === RECORD_STATUSES.DRAFT);
    const published = data.mine.filter((record) => record.status === RECORD_STATUSES.COMPLETED);

    function handleStudentChange(event) {
        const value = event.target.value;
        setSearchParams(value ? { studentUserId: value } : {});
    }

    return (
        <main className="round-screen">
            <div className="round-screen__header">
                <h1>活動記録</h1>
                {canWrite && (
                    <Button onClick={() => navigate(PATHS.recordNew)}>活動記録を登録する</Button>
                )}
            </div>

            {state?.noticeId && <Notice message={getMessage(state.noticeId)} />}

            <section className="record-screen__section">
                <h2>下書き</h2>
                {drafts.length === 0 ? (
                    <EmptyState message={getMessage('N-006')} />
                ) : (
                    <RecordTable records={drafts} showUpdatedAt canWrite={canWrite} />
                )}
            </section>

            <section className="record-screen__section">
                <h2>公開済み</h2>
                {published.length === 0 ? (
                    <EmptyState message={getMessage('N-006')}>
                        {role === ROLES.INSTRUCTOR && (
                            <Link to={PATHS.search}>過去情報検索で公開済みの記録を探す</Link>
                        )}
                    </EmptyState>
                ) : (
                    <RecordTable records={published} canWrite={canWrite} />
                )}
            </section>

            {isAdmin && (
                <section className="record-screen__section">
                    <h2>学生の下書き（管理者）</h2>
                    <div className="round-screen__filter">
                        <FormField label="対象学生">
                            <Select
                                value={studentUserId}
                                onChange={handleStudentChange}
                                options={studentOptions(data.students)}
                                placeholder="全学生"
                            />
                        </FormField>
                    </div>
                    {data.studentDrafts.length === 0 ? (
                        <EmptyState message={getMessage('N-006')} />
                    ) : (
                        <RecordTable records={data.studentDrafts} showUpdatedAt canWrite />
                    )}
                </section>
            )}
        </main>
    );
}

export default RecordListScreen;
