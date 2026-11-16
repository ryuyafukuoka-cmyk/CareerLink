import { getMessage } from '@/messages';
import RouteNotice from './RouteNotice.jsx';

// Unknown URL.
function NotFoundPage() {
    return <RouteNotice message={getMessage('E-004')} showHomeLink />;
}

export default NotFoundPage;
