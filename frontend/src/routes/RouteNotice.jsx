import { Link } from 'react-router-dom';
import ErrorMessage from '@/components/ErrorMessage/ErrorMessage.jsx';
import { PATHS } from './paths.js';
import './RouteNotice.css';

// Full-page notice for route-level problems (no permission, unknown URL).
function RouteNotice({ message, showHomeLink = false }) {
    return (
        <main className="route-notice">
            <ErrorMessage message={message} />
            {showHomeLink && (
                <Link className="route-notice__link" to={PATHS.home}>
                    ホームへ戻る
                </Link>
            )}
        </main>
    );
}

export default RouteNotice;
