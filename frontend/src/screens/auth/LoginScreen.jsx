import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { USE_MOCK_AUTH } from '@/auth/mockAuth.js';
import { useAuth } from '@/auth/useAuth.js';
import BorderGlow from '@/components/BorderGlow/BorderGlow.jsx';
import Button from '@/components/Button/Button.jsx';
import DotField from '@/components/DotField/DotField.jsx';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import Loading from '@/components/Loading/Loading.jsx';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import './LoginScreen.css';

// SC-00-01 Login. Only a login button: the school ID and password are typed on the AD FS
// screen, never in CareerLink.
// Mock mode (VITE_USE_MOCK_AUTH=true): pick a user with the dev switcher at the bottom right.
// Week 6: the button starts the Cognito login (startLogin).
function LoginScreen() {
    const { user, loading, login } = useAuth();
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    if (loading) return <Loading centered />;
    if (user) return <Navigate to={PATHS.home} replace />;

    async function handleLogin() {
        setError(null);
        if (USE_MOCK_AUTH) {
            // Mock login happens in the dev switcher. Move focus there.
            document.getElementById('dev-role-switcher-select')?.focus();
            return;
        }
        setBusy(true);
        try {
            await login();
        } catch {
            setError(getMessage('E-102'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="login-screen">
            <DotField />
            <ThemeToggle className="login-screen__theme" />
            <section className="login-screen__card" aria-labelledby="login-title">
                <p className="login-screen__eyebrow">ICTエンジニア科 就職活動記録システム</p>
                <h1 id="login-title" className="login-screen__title">
                    CareerLink
                </h1>
                <p className="login-screen__lead">
                    先輩たちの経験を探して、自分の就職活動を記録しよう。
                </p>
                {error && <ErrorMessage message={error} />}
                <BorderGlow className="login-screen__glow" active={!busy}>
                    <Button className="login-screen__button" onClick={handleLogin} loading={busy}>
                        <LogIn size={18} aria-hidden="true" />
                        学校アカウントでログイン
                    </Button>
                </BorderGlow>
                <p className="login-screen__note">
                    IDとパスワードは学校の認証画面で入力します。CareerLinkには保存されません。
                </p>
                {USE_MOCK_AUTH && (
                    <p className="login-screen__dev">
                        開発モード：画面右下の「開発用ログイン切替」でユーザを選んでください。
                    </p>
                )}
            </section>
        </main>
    );
}

export default LoginScreen;
