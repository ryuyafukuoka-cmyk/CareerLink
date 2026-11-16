import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth.js';
import Loading from '@/components/Loading/Loading.jsx';
import { PATHS } from './paths.js';

// Route guard: anything below this needs a logged-in user.
// Not logged in -> login screen (the page asked for is kept in `state.from`).
// This only controls what is shown. The API checks permissions again every time.
function RequireLogin() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Loading centered />;
    if (!user) return <Navigate to={PATHS.login} replace state={{ from: location }} />;
    return <Outlet />;
}

export default RequireLogin;
