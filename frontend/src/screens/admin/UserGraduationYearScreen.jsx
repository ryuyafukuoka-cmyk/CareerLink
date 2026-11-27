import { useState } from 'react';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROLES } from '@shared/definitions';
import { updateGraduationYear } from '@/api/users.js';
import Button from '@/components/Button/Button.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import TextLink from '@/components/TextLink/TextLink.jsx';
import { getErrorMessage, getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import { useTargetUser } from './useTargetUser.js';
import './AdminScreens.css';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

// Accept full-width digits too (０-９ -> 0-9).
const toHalfWidth = (text) =>
    text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

// An integer from 2000 to 2100, or null.
function parseYear(text) {
    const value = toHalfWidth(text.trim());
    if (!/^\d+$/.test(value)) return null;
    const year = Number(value);
    return year >= MIN_YEAR && year <= MAX_YEAR ? year : null;
}

// SC-06-05 Change a student's graduation year (instructors and admins). The year is used by search and the karte.
function UserGraduationYearScreen() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user, error, loading, reload } = useTargetUser(userId);

    // null = not edited yet: the field then shows the current year.
    const [value, setValue] = useState(null);
    const [fieldError, setFieldError] = useState('');
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

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
    if (user.role !== ROLES.STUDENT) {
        return (
            <main className="admin-screen">
                <ErrorMessage message={getMessage('E-004')} />
                <TextLink to={detailPath}>ユーザ詳細へ戻る</TextLink>
            </main>
        );
    }

    const text = value ?? (user.graduationYear ? String(user.graduationYear) : '');

    async function handleSubmit(event) {
        event.preventDefault();
        if (saving) return;
        setFormError(null);

        const year = parseYear(text);
        if (year === null) {
            setFieldError(getMessage('E-209'));
            return;
        }
        setFieldError('');

        setSaving(true);
        try {
            await updateGraduationYear(userId, year);
            navigate(detailPath, { replace: true, state: { noticeId: 'S-201' } });
        } catch (caught) {
            if (caught.fieldErrors?.year) setFieldError(getMessage(caught.fieldErrors.year));
            else setFormError(getErrorMessage(caught));
            setSaving(false);
        }
    }

    return (
        <main className="admin-screen">
            <header className="admin-screen__header">
                <div>
                    <h1>卒業年度の変更</h1>
                    <p className="admin-screen__lead">{user.displayName}さん</p>
                </div>
            </header>

            <form className="admin-screen__panel" onSubmit={handleSubmit} noValidate>
                {formError && <ErrorMessage message={formError} />}
                <FormField
                    label="卒業年度"
                    required
                    error={fieldError}
                    hint={`西暦${MIN_YEAR}〜${MAX_YEAR}の整数で入力してください。変更は年度別の表示・検索にも反映されます。`}
                >
                    <TextInput
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={8}
                        value={text}
                        onChange={(event) => setValue(event.target.value)}
                    />
                </FormField>
                <div className="admin-screen__actions">
                    <Button type="submit" loading={saving}>
                        保存
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(detailPath)}>
                        キャンセル
                    </Button>
                </div>
            </form>
        </main>
    );
}

export default UserGraduationYearScreen;
