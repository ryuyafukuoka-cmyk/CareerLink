import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    ACTIVITY_TYPE_LABELS,
    ACTIVITY_TYPE_ORDER,
    ROLES,
    USER_STATUS_LABELS,
} from '@shared/definitions';
import { deleteActivityRecord, getDeleteConfirmInfo, listDrafts } from '@/api/records.js';
import { listUsers } from '@/api/users.js';
import Button from '@/components/Button/Button.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import EmptyState from '@/components/EmptyState/EmptyState.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import Select from '@/components/Select/Select.jsx';
import { getMessage } from '@/messages';
import { formatDateTime } from '@/utils/date.js';
import './AdminScreens.css';

const typeText = (types) =>
    ACTIVITY_TYPE_ORDER.filter((t) => types.includes(t))
        .map((t) => ACTIVITY_TYPE_LABELS[t])
        .join('・');

// SC-06-07 Draft cleanup (admin only, Should). Pick a student, then delete that student's drafts
// one at a time after a confirmation (C-002). Only drafts are listed: published records are kept.
// Accounts are never deleted here; deleting a draft keeps the company and the application round.
function DraftCleanupScreen() {
    const [searchParams, setSearchParams] = useSearchParams();
    const userId = searchParams.get('userId') ?? '';

    const [students, setStudents] = useState({ list: [], error: null, loading: true });
    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState({ key: null, drafts: null, error: null });
    const requestKey = `${userId}|${reloadCount}`;
    const loading = userId !== '' && result.key !== requestKey;

    // Dialog: null (closed) or { info, saving, error }.
    const [dialog, setDialog] = useState(null);
    const [deletedNotice, setDeletedNotice] = useState(false);

    useEffect(() => {
        let cancelled = false;
        listUsers({ role: ROLES.STUDENT })
            .then((list) => !cancelled && setStudents({ list, error: null, loading: false }))
            .catch((error) => !cancelled && setStudents({ list: [], error, loading: false }));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!userId) return undefined;
        let cancelled = false;
        listDrafts({ userId })
            .then((all) => {
                if (cancelled) return;
                // R-03 puts drafts first; keep only drafts to be safe.
                const drafts = all.filter((r) => r.status === 'draft');
                setResult({ key: requestKey, drafts, error: null });
            })
            .catch((error) => !cancelled && setResult({ key: requestKey, drafts: null, error }));
        return () => {
            cancelled = true;
        };
    }, [userId, requestKey]);

    const student = students.list.find((s) => s.userId === userId);

    function chooseStudent(event) {
        setDeletedNotice(false);
        setSearchParams(event.target.value ? { userId: event.target.value } : {});
    }

    // Step 1: load the identification info for the confirmation dialog (R-08).
    async function askDelete(recordId) {
        setDeletedNotice(false);
        try {
            setDialog({ info: await getDeleteConfirmInfo(recordId), saving: false, error: null });
        } catch (error) {
            setResult((current) => ({ ...current, error }));
        }
    }

    // Step 2: delete after the admin confirmed (R-09), then reload the list.
    async function handleConfirm() {
        const { info } = dialog;
        setDialog({ info, saving: true, error: null });
        try {
            await deleteActivityRecord(info.recordId);
            setDialog(null);
            setDeletedNotice(true);
            setReloadCount((n) => n + 1);
        } catch (error) {
            setDialog({ info, saving: false, error });
        }
    }

    const { drafts, error } = loading ? { drafts: null, error: null } : result;

    return (
        <main className="admin-screen">
            <h1>卒業・退校後の下書き削除</h1>
            <p className="admin-screen__muted">
                学生を選ぶと、その学生の下書きが表示されます。削除すると元に戻せません。公開済みの記録は削除されません。
            </p>

            {students.error && <ErrorMessage error={students.error} />}
            <div className="admin-screen__filters">
                <FormField label="対象の学生">
                    <Select
                        options={students.list.map((s) => ({
                            value: s.userId,
                            label: `${s.displayName}（${USER_STATUS_LABELS[s.status]}${
                                s.graduationYear ? `・${s.graduationYear}年度` : ''
                            }）`,
                        }))}
                        placeholder="学生を選択してください"
                        value={userId}
                        onChange={chooseStudent}
                        disabled={students.loading}
                    />
                </FormField>
            </div>

            {deletedNotice && <Notice message={getMessage('S-005')} />}
            {userId && loading && <Loading />}
            {error && <ErrorMessage error={error} onRetry={() => setReloadCount((n) => n + 1)} />}
            {drafts && drafts.length === 0 && <EmptyState message={getMessage('N-006')} />}
            {drafts && drafts.length > 0 && (
                <>
                    <Notice
                        message={`${student?.displayName ?? ''}さんの下書きが${drafts.length}件あります。`}
                    />
                    <div className="admin-screen__table-wrap">
                        <table className="admin-screen__table">
                            <thead>
                                <tr>
                                    <th scope="col">企業</th>
                                    <th scope="col">活動種別</th>
                                    <th scope="col">実施日</th>
                                    <th scope="col">最終更新</th>
                                    <th scope="col">
                                        <span className="visually-hidden">操作</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {drafts.map((draft) => (
                                    <tr key={draft.recordId}>
                                        <td>{draft.companyName}</td>
                                        <td>{typeText(draft.activityTypes)}</td>
                                        <td>{draft.conductedOn ?? '未設定'}</td>
                                        <td>{formatDateTime(draft.updatedAt)}</td>
                                        <td>
                                            <Button
                                                variant="danger"
                                                onClick={() => askDelete(draft.recordId)}
                                            >
                                                削除
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <ConfirmDialog
                open={dialog !== null}
                title="下書きを削除する"
                message={
                    dialog
                        ? getMessage('C-002', {
                              企業名: dialog.info.companyName,
                              実施日: dialog.info.conductedOn ?? '実施日未設定',
                          })
                        : ''
                }
                confirmLabel="削除する"
                variant="danger"
                loading={dialog?.saving}
                onConfirm={handleConfirm}
                onCancel={() => setDialog(null)}
            >
                {dialog?.error && <ErrorMessage error={dialog.error} />}
            </ConfirmDialog>
        </main>
    );
}

export default DraftCleanupScreen;
