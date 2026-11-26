import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { generatePath, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ACTIVITY_TYPE_LABELS, RECORD_STATUSES, ROLES } from '@shared/definitions';
import { listDrafts, listMyActivityRecords } from '@/api/records.js';
import { listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Badge from '@/components/Badge/Badge.jsx';
import Button from '@/components/Button/Button.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Select from '@/components/Select/Select.jsx';
import StatusMark from '@/components/StatusMark/StatusMark.jsx';
import Tabs from '@/components/Tabs/Tabs.jsx';
import TextLink from '@/components/TextLink/TextLink.jsx';
import { toast } from '@/components/Toast/toast.js';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { formatDateTime } from '@/utils/date.js';
import { displayDate, studentOptions } from '../rounds/roundHelpers.js';
import '../rounds/RoundScreens.css';
import './RecordScreens.css';

// One table of record summaries. showUpdatedAt is for drafts (sorted by last update).
function RecordTable({ records, showUpdatedAt = false, canWrite }) {
    return (
        <div className="round-screen__table-wrap record-screen__table-wrap">
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
                                <td>
                                    <TextLink to={generatePath(PATHS.recordDetail, params)}>
                                        {record.companyName}
                                    </TextLink>
                                </td>
                                <td>
                                    <span className="record-screen__types">
                                        {record.activityTypes.map((type) => (
                                            <Badge key={type} size="sm">
                                                {ACTIVITY_TYPE_LABELS[type]}
                                            </Badge>
                                        ))}
                                    </span>
                                </td>
                                <td>{displayDate(record.conductedOn)}</td>
                                {showUpdatedAt && <td>{formatDateTime(record.updatedAt)}</td>}
                                <td>
                                    <StatusMark status={record.status} size="sm" />
                                </td>
                                <td>
                                    <span className="round-screen__links">
                                        <TextLink to={generatePath(PATHS.recordDetail, params)}>
                                            詳細
                                        </TextLink>
                                        {canWrite && (
                                            <TextLink to={generatePath(PATHS.recordEdit, params)}>
                                                編集
                                            </TextLink>
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

// Tab title with a count.
function TabLabel({ text, count }) {
    return (
        <span className="record-screen__tab-label">
            {text}
            <Badge size="sm" tone="neutral">
                {count}
            </Badge>
        </span>
    );
}

// SC-02-01 Activity record list.
// Own records are shown in two separate groups: drafts (last update, newest first) and published (date, newest first).
// Admins also see drafts of all students, or of one chosen student (kept in the URL).
function RecordListScreen() {
    const navigate = useNavigate();
    const { state, pathname, search } = useLocation();
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

    // Result message from the form (S-002 / S-003 ...): show it once as a toast, then clear it
    // from the history entry so a refresh does not show it again.
    const noticeId = state?.noticeId;
    const noticeTone = state?.noticeTone;
    useEffect(() => {
        if (!noticeId) return;
        const show = noticeTone === 'error' ? toast.error : toast.success;
        show(getMessage(noticeId));
        navigate(`${pathname}${search}`, { replace: true, state: null });
    }, [noticeId, noticeTone, navigate, pathname, search]);

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
        setSearchParams(value ? { tab: 'students', studentUserId: value } : { tab: 'students' });
    }

    const tabs = [
        {
            value: 'drafts',
            label: <TabLabel text="下書き" count={drafts.length} />,
            content:
                drafts.length === 0 ? (
                    <EmptyState message={getMessage('N-006')} />
                ) : (
                    <RecordTable records={drafts} showUpdatedAt canWrite={canWrite} />
                ),
        },
        {
            value: 'published',
            label: <TabLabel text="公開済み" count={published.length} />,
            content:
                published.length === 0 ? (
                    <EmptyState message={getMessage('N-006')}>
                        {role === ROLES.INSTRUCTOR && (
                            <TextLink to={PATHS.search}>
                                過去情報検索で公開済みの記録を探す
                            </TextLink>
                        )}
                    </EmptyState>
                ) : (
                    <RecordTable records={published} canWrite={canWrite} />
                ),
        },
    ];

    if (isAdmin) {
        tabs.push({
            value: 'students',
            label: <TabLabel text="学生の下書き" count={data.studentDrafts.length} />,
            content: (
                <div className="record-screen__section">
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
                </div>
            ),
        });
    }

    // The open tab lives in the URL (?tab=), so it survives the reload the student filter causes.
    const requestedTab = searchParams.get('tab');
    const activeTab = tabs.some((tab) => tab.value === requestedTab)
        ? requestedTab
        : drafts.length > 0
          ? 'drafts'
          : 'published';

    function handleTabChange(value) {
        setSearchParams(
            value === 'students' && studentUserId ? { tab: value, studentUserId } : { tab: value },
            { replace: true },
        );
    }

    return (
        <main className="round-screen">
            <div className="round-screen__header">
                <h1>活動記録</h1>
                {canWrite && (
                    <Button
                        className="record-screen__new"
                        onClick={() => navigate(PATHS.recordNew)}
                    >
                        <Plus size={18} aria-hidden="true" />
                        活動記録を登録する
                    </Button>
                )}
            </div>

            <Tabs
                label="活動記録の種類"
                items={tabs}
                value={activeTab}
                onChange={handleTabChange}
            />
        </main>
    );
}

export default RecordListScreen;
