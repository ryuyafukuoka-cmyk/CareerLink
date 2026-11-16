import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getMe } from '@/api/auth.js';
import { registerGraduationYear } from '@/api/users.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import FormField from '@/components/FormField/FormField.jsx';
import TextInput from '@/components/TextInput/TextInput.jsx';
import { getErrorMessage, getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import './FirstRegistrationScreen.css';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

// Accept full-width digits too (０-９ -> 0-9).
function toHalfWidth(text) {
    return text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

// Returns the year as a number, or null when it is not an integer from 2000 to 2100.
function parseYear(text) {
    const value = toHalfWidth(text.trim());
    if (!/^\d+$/.test(value)) return null;
    const year = Number(value);
    return year >= MIN_YEAR && year <= MAX_YEAR ? year : null;
}

// SC-00-03 First login: the student enters the expected graduation year (once).
// RequireLogin sends students here until the year is set. Changes later go through an instructor.
function FirstRegistrationScreen() {
    const { needsGraduationYear, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [value, setValue] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    // Set once we are leaving the screen, so the "already set" redirect below does not fight navigate().
    const [leaving, setLeaving] = useState(false);

    if (!needsGraduationYear && !leaving) return <Navigate to={PATHS.home} replace />;

    function leave(user, noticeId, noticeTone) {
        setLeaving(true);
        updateUser(user);
        navigate(PATHS.home, { replace: true, state: { noticeId, noticeTone } });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (saving) return;
        setFormError(null);

        const year = parseYear(value);
        if (year === null) {
            setFieldError(getMessage('E-209'));
            return;
        }
        setFieldError('');

        setSaving(true);
        try {
            const user = await registerGraduationYear(year);
            leave(user, 'S-201', 'success');
        } catch (error) {
            if (error.status === 409) {
                // Already set (e.g. in another tab): load the current user and go on.
                try {
                    leave(await getMe(), 'E-210', 'error');
                    return;
                } catch {
                    setFormError(getMessage('E-210'));
                }
            } else if (error.fieldErrors?.year) {
                setFieldError(getMessage(error.fieldErrors.year));
            } else {
                setFormError(getErrorMessage(error));
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="first-registration">
            <form className="first-registration__card" onSubmit={handleSubmit} noValidate>
                <h1 className="first-registration__title">初回登録</h1>
                <p>{getMessage('N-001')}</p>
                {formError && <ErrorMessage message={formError} />}
                <FormField
                    label="卒業見込み年度"
                    required
                    error={fieldError}
                    hint={`西暦${MIN_YEAR}〜${MAX_YEAR}の整数で入力してください（例：2027）。`}
                >
                    <TextInput
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={8}
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        disabled={saving}
                    />
                </FormField>
                <div className="first-registration__actions">
                    <Button variant="secondary" onClick={logout} disabled={saving}>
                        ログアウト
                    </Button>
                    <Button type="submit" loading={saving}>
                        保存して始める
                    </Button>
                </div>
            </form>
        </main>
    );
}

export default FirstRegistrationScreen;
