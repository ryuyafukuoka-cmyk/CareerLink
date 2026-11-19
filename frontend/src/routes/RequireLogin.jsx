import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth.js';
import Loading from '@/components/Loading/Loading.jsx';
import { PATHS } from './paths.js';

// Route guard: anything below this needs a logged-in user.
// Not logged in -> login screen (the page asked for is kept in `state.from`).
// A student who has not set the graduation year yet is sent to SC-00-03 first (every other screen is blocked).
// This only controls what is shown. The API checks permissions again every time.
function RequireLogin() {
    const { user, loading, needsGraduationYear } = useAuth();
    const location = useLocation();

    if (loading) return <Loading centered />;
    if (!user) return <Navigate to={PATHS.login} replace state={{ from: location }} />;
    if (needsGraduationYear && location.pathname !== PATHS.firstRegistration) {
        return <Navigate to={PATHS.firstRegistration} replace />;
    }
    return <Outlet />;
}

export default RequireLogin;
