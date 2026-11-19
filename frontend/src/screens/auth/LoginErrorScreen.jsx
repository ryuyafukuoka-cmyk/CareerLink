import { Link, useLocation } from 'react-router-dom';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import { getMessage } from '@/messages';
import { PATHS } from '@/routes/paths.js';
import './LoginErrorScreen.css';

// Reason (from the API `reason` or the login flow) -> message ID.
const MESSAGE_ID_BY_REASON = {
    AUTH_FAILED: 'E-101',
    STATE_MISMATCH: 'E-102',
    NOT_ELIGIBLE: 'E-103',
    ACCOUNT_INACTIVE: 'E-104',
};

// SC-00-02 Authentication / access denied. The reason comes in through navigate(..., { state: { reason } }).
// After a reload the state is gone, so the general "authentication failed" message is shown.
function LoginErrorScreen() {
    const { state } = useLocation();
    const messageId = MESSAGE_ID_BY_REASON[state?.reason] ?? 'E-101';

    return (
        <main className="login-error-screen">
            <section className="login-error-screen__card">
                <h1 className="login-error-screen__title">ログインできませんでした</h1>
                <ErrorMessage message={getMessage(messageId)} />
                <Link to={PATHS.login}>ログイン画面へ戻る</Link>
            </section>
        </main>
    );
}

export default LoginErrorScreen;
