import { useState } from 'react';
import { Link, generatePath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ROLE_LABELS, ROLES, USER_STATUSES, USER_STATUS_LABELS } from '@shared/definitions';
import { setUserStatus } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { useTargetUser } from './useTargetUser.js';
import './AdminScreens.css';

// SC-06-02 User detail and management.
// Instructors and admins: change a student's graduation year and status (never their own status).
// Admins only: change the role of another user (never their own).
function UserDetailScreen() {
    const { userId } = useParams();
    const { user: me, role } = useAuth();
    const { state } = useLocation();
    const navigate = useNavigate();
    const { user, error, loading, reload, setUser } = useTargetUser(userId);

    // Status dialog: null (closed) or { saving, error }.
    const [dialog, setDialog] = useState(null);
    const [savedNotice, setSavedNotice] = useState(false);

    if (loading) return <Loading centered />;
    if (error) {
        return (
            <main className="admin-screen">
                <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} />
                <Link to={PATHS.adminUsers}>ユーザ一覧へ戻る</Link>
            </main>
        );
    }

    const isSelf = user.userId === me?.userId;
    const isStudent = user.role === ROLES.STUDENT;
    const canChangeStatus = isStudent && !isSelf; // staff only: this screen is staff-only
    const canChangeRole = role === ROLES.ADMIN && !isSelf;
    const nextStatus =
        user.status === USER_STATUSES.ACTIVE ? USER_STATUSES.INACTIVE : USER_STATUSES.ACTIVE;
    const goingInactive = nextStatus === USER_STATUSES.INACTIVE;

    async function handleConfirm() {
        setDialog({ saving: true, error: null });
        try {
            setUser(await setUserStatus(user.userId, nextStatus));
            setDialog(null);
            setSavedNotice(true);
        } catch (caught) {
            setDialog({ saving: false, error: caught });
        }
    }

    const noticeId = savedNotice ? 'S-203' : state?.noticeId;

    return (
        <main className="admin-screen">
            <Link to={PATHS.adminUsers}>← ユーザ一覧</Link>

            {noticeId && <Notice message={getMessage(noticeId)} />}

            <div className="admin-screen__header">
                <h1>{user.displayName}</h1>
            </div>

            <dl className="admin-screen__panel admin-screen__info">
                <dt>ロール</dt>
                <dd>{ROLE_LABELS[user.role]}</dd>
                <dt>利用状態</dt>
                <dd>{USER_STATUS_LABELS[user.status]}</dd>
                <dt>卒業年度</dt>
                <dd>{user.graduationYear ? `${user.graduationYear}年度` : '未設定'}</dd>
            </dl>

            <div className="admin-screen__actions">
                {isStudent && (
                    <Button
                        variant="secondary"
                        onClick={() =>
                            navigate(generatePath(PATHS.adminUserGraduationYear, { userId }))
                        }
                    >
                        卒業年度を変更
                    </Button>
                )}
                {canChangeStatus && (
                    <Button
                        variant={goingInactive ? 'danger' : 'primary'}
                        onClick={() => setDialog({ saving: false, error: null })}
                    >
                        {goingInactive ? 'アカウントを無効にする' : 'アカウントを有効にする'}
                    </Button>
                )}
                {canChangeRole && (
                    <Button
                        variant="secondary"
                        onClick={() => navigate(generatePath(PATHS.adminUserRole, { userId }))}
                    >
                        ロールを変更
                    </Button>
                )}
            </div>
            {isSelf && (
                <p className="admin-screen__muted">自分自身のロール・利用状態は変更できません。</p>
            )}

            <ConfirmDialog
                open={dialog !== null}
                title={goingInactive ? 'アカウントを無効にする' : 'アカウントを有効にする'}
                message={getMessage(goingInactive ? 'C-201' : 'C-202', { 氏名: user.displayName })}
                variant={goingInactive ? 'danger' : 'primary'}
                loading={dialog?.saving}
                onConfirm={handleConfirm}
                onCancel={() => setDialog(null)}
            >
                {dialog?.error && <ErrorMessage error={dialog.error} />}
            </ConfirmDialog>
        </main>
    );
}

export default UserDetailScreen;
