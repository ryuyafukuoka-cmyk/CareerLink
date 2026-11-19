import { useEffect, useState } from 'react';
import {
    Link,
    generatePath,
    useLocation,
    useMatch,
    useNavigate,
    useParams,
} from 'react-router-dom';
import {
    ACTIVITY_TYPE_LABELS,
    RECORD_STATUSES,
    RECORD_STATUS_LABELS,
    ROLES,
} from '@shared/definitions';
import { deleteActivityRecord, getDeleteConfirmInfo, getRecordDetail } from '@/api/records.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { formatDateTime } from '@/utils/date.js';
import { displayDate } from '../rounds/roundHelpers.js';
import '../rounds/RoundScreens.css';
import RecordSectionsView from './RecordSectionsView.jsx';
import './RecordScreens.css';

// SC-02-02 Record detail. SC-03-03 (past record detail from search) is this same screen on another path.
// Shows common fields, one block per activity type, always the N-002 note, and the edit history.
// Names (poster, last editor, history) arrive as null when the viewer may not see them: those lines are left out.
// Buttons by role: edit = owner / admin (drafts and published), instructor (published only); delete = owner / admin.
function RecordDetailScreen() {
    const { recordId } = useParams();
    const { user, role } = useAuth();
    const { state } = useLocation();
    const navigate = useNavigate();
    const fromSearch = Boolean(useMatch(PATHS.searchRecordDetail));

    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, data: null, error: null });
    const requestKey = `${recordId}|${role}|${reloadCount}`;

    // Delete dialog: null (closed) or { info, deleting, error }.
    const [deleteState, setDeleteState] = useState(null);
    const [preparingDelete, setPreparingDelete] = useState(false);
    const [prepareError, setPrepareError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getRecordDetail(recordId)
            .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
            .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }));
        return () => {
            cancelled = true;
        };
    }, [recordId, requestKey]);

    // From search: go back to the same results (conditions and page) when the link passed them.
    const backPath = fromSearch ? (state?.backTo ?? PATHS.searchResults) : PATHS.records;
    const backLabel = fromSearch ? '← 検索結果' : '← 活動記録一覧';

    if (result.key !== requestKey) return <Loading centered />;

    const { data: record, error } = result;
    if (error) {
        const noRetry = error.status === 404 || error.status === 403;
        return (
            <main className="round-screen">
                <ErrorMessage
                    error={error}
                    onRetry={noRetry ? undefined : () => setReloadCount((n) => n + 1)}
                />
                <Link to={backPath}>{backLabel.replace('← ', '')}へ戻る</Link>
            </main>
        );
    }

    const isOwner = record.ownerUserId !== undefined && record.ownerUserId === user?.userId;
    const isAdmin = role === ROLES.ADMIN;
    const isDraft = record.status === RECORD_STATUSES.DRAFT;
    const canEdit =
        isOwner ||
        isAdmin ||
        (role === ROLES.INSTRUCTOR && record.status === RECORD_STATUSES.COMPLETED);
    const canDelete = isOwner || isAdmin;
    const params = { recordId: record.recordId };

    // R-08 first (what is going to be deleted), then the C-002 dialog.
    async function openDeleteDialog() {
        setPreparingDelete(true);
        setPrepareError(null);
        try {
            const info = await getDeleteConfirmInfo(record.recordId);
            setDeleteState({ info, deleting: false, error: null });
        } catch (caught) {
            setPrepareError(caught);
        } finally {
            setPreparingDelete(false);
        }
    }

    async function confirmDelete() {
        setDeleteState((current) => ({ ...current, deleting: true, error: null }));
        try {
            await deleteActivityRecord(record.recordId);
            navigate(PATHS.records, { replace: true, state: { noticeId: 'S-005' } });
        } catch (caught) {
            setDeleteState((current) => ({ ...current, deleting: false, error: caught }));
        }
    }

    return (
        <main className="round-screen">
            <Link to={backPath}>{backLabel}</Link>

            {state?.noticeId && <Notice message={getMessage(state.noticeId)} />}
            <p className="record-screen__notice-note">{getMessage('N-002')}</p>

            <div className="round-screen__header">
                <h1>
                    <Link
                        to={generatePath(PATHS.companyDetail, {
                            companyId: record.company.companyId,
                        })}
                    >
                        {record.company.nameOfficial}
                    </Link>
                </h1>
                <div className="round-screen__links">
                    {canEdit && (
                        <Button
                            variant="secondary"
                            onClick={() => navigate(generatePath(PATHS.recordEdit, params))}
                        >
                            編集
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="danger"
                            loading={preparingDelete}
                            loadingText="確認中…"
                            onClick={openDeleteDialog}
                        >
                            削除
                        </Button>
                    )}
                </div>
            </div>

            {prepareError && <ErrorMessage error={prepareError} />}

            <dl className="round-screen__info">
                {isDraft && (
                    <>
                        <dt>状態</dt>
                        <dd>
                            <span className="record-screen__badge">
                                {RECORD_STATUS_LABELS[record.status]}
                            </span>
                        </dd>
                    </>
                )}
                <dt>活動種別</dt>
                <dd>{record.activityTypes.map((type) => ACTIVITY_TYPE_LABELS[type]).join('、')}</dd>
                <dt>実施日</dt>
                <dd>{displayDate(record.conductedOn)}</dd>
                <dt>卒業年度</dt>
                <dd>{record.graduationYear ? `${record.graduationYear}年度` : '—'}</dd>
                {record.posterName && (
                    <>
                        <dt>投稿者</dt>
                        <dd>{record.posterName}</dd>
                    </>
                )}
                <dt>登録日時</dt>
                <dd>{formatDateTime(record.createdAt)}</dd>
                <dt>最終更新日時</dt>
                <dd>{formatDateTime(record.lastUpdatedAt)}</dd>
                {record.lastEditorName && (
                    <>
                        <dt>最終更新者</dt>
                        <dd>{record.lastEditorName}</dd>
                    </>
                )}
            </dl>

            <RecordSectionsView activityTypes={record.activityTypes} sections={record.sections} />

            <section className="record-screen__section">
                <h2>更新履歴</h2>
                {record.history.length === 0 ? (
                    <EmptyState message={getMessage('N-006')} />
                ) : (
                    <ul className="round-screen__history">
                        {record.history.map((item) => (
                            <li key={item.editedAt}>
                                {formatDateTime(item.editedAt)}
                                {item.editorName && ` ${item.editorName}`}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {deleteState && (
                <ConfirmDialog
                    open
                    title="活動記録の削除"
                    message={getMessage('C-002', {
                        企業名: deleteState.info.companyName,
                        実施日: displayDate(deleteState.info.conductedOn),
                    })}
                    confirmLabel="削除する"
                    variant="danger"
                    loading={deleteState.deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteState(null)}
                >
                    {deleteState.error && (
                        <ErrorMessage
                            className="record-screen__delete-error"
                            error={deleteState.error}
                        />
                    )}
                </ConfirmDialog>
            )}
        </main>
    );
}

export default RecordDetailScreen;
