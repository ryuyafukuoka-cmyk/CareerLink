import { useEffect, useState } from 'react';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROLE_LABELS, ROLES, USER_STATUSES } from '@shared/definitions';
import { changeUserRole, listUsers } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import { RoleBadge } from '@/components/Badge/Badge.jsx';
import Button from '@/components/Button/Button.jsx';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import RadioGroup from '@/components/RadioGroup/RadioGroup.jsx';
import TextLink from '@/components/TextLink/TextLink.jsx';
import { getErrorMessage, getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { useTargetUser } from './useTargetUser.js';
import './AdminScreens.css';

const ROLE_OPTIONS = Object.values(ROLES).map((value) => ({ value, label: ROLE_LABELS[value] }));

// SC-06-06 Change the role of another user (admin only).
// Your own role can never be changed. The last active admin cannot be demoted (warning here, 409 from the API).
function UserRoleScreen() {
    const { userId } = useParams();
    const { user: me } = useAuth();
    const navigate = useNavigate();
    const { user, error, loading, reload } = useTargetUser(userId);

    const [newRole, setNewRole] = useState(null); // null = not changed yet (shows the current role)
    const [activeAdminCount, setActiveAdminCount] = useState(null);
    const [dialog, setDialog] = useState(null); // null (closed) or { saving, error }

    // Number of active admins, to warn before demoting the last one. Unknown (null) just skips the warning.
    useEffect(() => {
        let cancelled = false;
        listUsers({ role: ROLES.ADMIN, status: USER_STATUSES.ACTIVE })
            .then((admins) => !cancelled && setActiveAdminCount(admins.length))
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const detailPath = generatePath(PATHS.adminUserDetail, { userId });

    if (loading) return <Loading centered />;
    if (error) {
        return (
            <main className="admin-screen">
                <ErrorMessage error={error} onRetry={error.status === 404 ? undefined : reload} />
                <TextLink to={PATHS.adminUsers}>ユーザ一覧へ戻る</TextLink>
            </main>
        );
    }
    if (user.userId === me?.userId) {
        return (
            <main className="admin-screen">
                <ErrorMessage message={getMessage('E-003')} />
                <p className="admin-screen__muted">自分自身のロールは変更できません。</p>
                <TextLink to={detailPath}>ユーザ詳細へ戻る</TextLink>
            </main>
        );
    }

    const selected = newRole ?? user.role;
    const unchanged = selected === user.role;
    const demotesLastAdmin =
        user.role === ROLES.ADMIN &&
        user.status === USER_STATUSES.ACTIVE &&
        selected !== ROLES.ADMIN &&
        activeAdminCount !== null &&
        activeAdminCount <= 1;

    async function handleConfirm() {
        setDialog({ saving: true, error: null });
        try {
            await changeUserRole(userId, selected);
            navigate(detailPath, { replace: true, state: { noticeId: 'S-202' } });
        } catch (caught) {
            setDialog({ saving: false, error: caught });
        }
    }

    return (
        <main className="admin-screen">
            <header className="admin-screen__header">
                <div>
                    <h1>ロールの変更</h1>
                    <p className="admin-screen__lead">{user.displayName}さん</p>
                </div>
            </header>

            <div className="admin-screen__panel">
                <p className="admin-screen__badges">
                    現在のロール：
                    <RoleBadge role={user.role} />
                </p>
                <FormField group label="新しいロール">
                    <RadioGroup
                        variant="card"
                        options={ROLE_OPTIONS}
                        value={selected}
                        onChange={setNewRole}
                    />
                </FormField>
                {demotesLastAdmin && <ErrorMessage message={getMessage('E-217')} />}
                <div className="admin-screen__actions">
                    <Button
                        disabled={unchanged || demotesLastAdmin}
                        onClick={() => setDialog({ saving: false, error: null })}
                    >
                        変更する
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(detailPath)}>
                        キャンセル
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                open={dialog !== null}
                title="ロールの変更"
                message={getMessage('C-203', {
                    氏名: user.displayName,
                    ロール名: ROLE_LABELS[selected],
                })}
                loading={dialog?.saving}
                onConfirm={handleConfirm}
                onCancel={() => setDialog(null)}
            >
                {dialog?.error && (
                    <ErrorMessage
                        message={
                            dialog.error.status === 409
                                ? getMessage('E-217')
                                : getErrorMessage(dialog.error)
                        }
                    />
                )}
            </ConfirmDialog>
        </main>
    );
}

export default UserRoleScreen;
