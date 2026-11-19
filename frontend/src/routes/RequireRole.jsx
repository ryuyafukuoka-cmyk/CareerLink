import { Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth.js';
import { getMessage } from '@/messages';
import RouteNotice from './RouteNotice.jsx';

// Route guard: only the given roles may see what is below. Use inside RequireLogin.
// Wrong role -> permission message (E-003).
function RequireRole({ roles }) {
    const { role } = useAuth();

    if (!role || !roles.includes(role)) {
        return <RouteNotice message={getMessage('E-003')} showHomeLink />;
    }
    return <Outlet />;
}

export default RequireRole;
