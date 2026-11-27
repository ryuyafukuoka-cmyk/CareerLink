import { useState } from 'react';
import { generatePath, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { ROLES, USER_STATUSES } from '@shared/definitions';
import { setUserStatus } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import { RoleBadge, UserStatusBadge } from '@/components/Badge/Badge.jsx';
import { usePageTitle } from '@/components/AppLayout/BreadcrumbContext.js';
import Button from '@/components/Button/Button.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import Notice from '@/components/Notice/Notice.jsx';
import TextLink from '@/components/TextLink/TextLink.jsx';
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

    usePageTitle(user?.displayName);

    if (loading) return <Loading centered />;
    if (error) {
        return (
            <main className="admin-screen">
                <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} />
                <TextLink to={PATHS.adminUsers}>ユーザ一覧へ戻る</TextLink>
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
            {noticeId && <Notice message={getMessage(noticeId)} />}

            <header className="admin-screen__hero">
                <span className="admin-screen__avatar admin-screen__avatar--lg" aria-hidden="true">
                    {user.displayName.slice(0, 1)}
                </span>
                <div className="admin-screen__hero-main">
                    <h1>{user.displayName}</h1>
                    <div className="admin-screen__badges">
                        <RoleBadge role={user.role} />
                        <UserStatusBadge status={user.status} />
                    </div>
                </div>
            </header>

            <section className="admin-screen__panel">
                <h2 className="admin-screen__section-title">ユーザ情報</h2>
                <dl className="admin-screen__info">
                    <dt>卒業年度</dt>
                    <dd>{user.graduationYear ? `${user.graduationYear}年度` : '未設定'}</dd>
                </dl>
            </section>

            <section className="admin-screen__panel">
                <h2 className="admin-screen__section-title">管理操作</h2>
                <div className="admin-screen__actions">
                    {isStudent && (
                        <Button
                            variant="secondary"
                            onClick={() =>
                                navigate(generatePath(PATHS.adminUserGraduationYear, { userId }))
                            }
                        >
                            <CalendarDays size={16} aria-hidden="true" />
                            卒業年度を変更
                        </Button>
                    )}
                    {canChangeStatus && (
                        <Button
                            variant={goingInactive ? 'danger' : 'primary'}
                            onClick={() => setDialog({ saving: false, error: null })}
                        >
                            {goingInactive ? (
                                <UserX size={16} aria-hidden="true" />
                            ) : (
                                <UserCheck size={16} aria-hidden="true" />
                            )}
                            {goingInactive ? 'アカウントを無効にする' : 'アカウントを有効にする'}
                        </Button>
                    )}
                    {canChangeRole && (
                        <Button
                            variant="secondary"
                            onClick={() => navigate(generatePath(PATHS.adminUserRole, { userId }))}
                        >
                            <ShieldCheck size={16} aria-hidden="true" />
                            ロールを変更
                        </Button>
                    )}
                </div>
                {isSelf && (
                    <p className="admin-screen__muted">
                        自分自身のロール・利用状態は変更できません。
                    </p>
                )}
            </section>

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
