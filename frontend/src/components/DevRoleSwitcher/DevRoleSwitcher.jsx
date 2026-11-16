import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USE_MOCK_AUTH, MOCK_LOGIN_OPTIONS, getStoredMockUserKey } from '@/auth/mockAuth.js';
import { useAuth } from '@/auth/useAuth.js';
import { PATHS } from '@/routes/paths.js';
import './DevRoleSwitcher.css';

// DEV ONLY: pick who you are logged in as (student / instructor / admin ...).
// Shown only when VITE_USE_MOCK_AUTH=true. Delete this folder on 12/21.
function DevRoleSwitcher() {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();
    const [selectedKey, setSelectedKey] = useState(() => getStoredMockUserKey() ?? '');
    const [busy, setBusy] = useState(false);

    if (!USE_MOCK_AUTH) return null;

    async function handleChange(event) {
        const key = event.target.value;
        setSelectedKey(key);

        if (!key) {
            logout();
            navigate(PATHS.login);
            return;
        }

        setBusy(true);
        try {
            await login(key);
            navigate(PATHS.home);
        } catch (error) {
            // Refused logins go to the access denied screen with the reason.
            navigate(PATHS.accessDenied, { state: { reason: error?.reason ?? 'AUTH_FAILED' } });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="dev-role-switcher">
            <label className="dev-role-switcher__label" htmlFor="dev-role-switcher-select">
                開発用ログイン切替
            </label>
            <select
                id="dev-role-switcher-select"
                className="dev-role-switcher__select"
                value={user ? selectedKey : ''}
                onChange={handleChange}
                disabled={busy}
            >
                <option value="">（ログアウト）</option>
                {MOCK_LOGIN_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default DevRoleSwitcher;
