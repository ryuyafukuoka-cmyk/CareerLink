import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getMenuTree } from '@/auth/menuTree.js';
import { useAuth } from '@/auth/useAuth.js';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb.jsx';
import SideRail from '@/components/SideRail/SideRail.jsx';
import UserMenu from '@/components/UserMenu/UserMenu.jsx';
import { buildTrail } from '@/routes/breadcrumbs.js';
import { PATHS } from '@/routes/paths.js';
import { BreadcrumbContext } from './BreadcrumbContext.js';
import './AppLayout.css';

// Frame for every logged-in screen: header (title, breadcrumb, account menu), floating side rail,
// page area.
// Used as a layout route, so each screen is drawn in <Outlet />.
function AppLayout() {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname, state } = useLocation();
    const menus = getMenuTree(role);
    const [pageTitle, setPageTitle] = useState(null); // { pathname, title } set by usePageTitle

    // Screens may replace the last label with real data; ignore a title left over from another page.
    const trail = buildTrail(pathname, state);
    if (pageTitle?.pathname === pathname && trail.length > 0) {
        trail[trail.length - 1] = { ...trail[trail.length - 1], label: pageTitle.title };
    }

    function handleLogout() {
        logout();
        navigate(PATHS.login);
    }

    return (
        <div className="app-layout">
            <header className="app-layout__header">
                <div className="app-layout__brand">
                    <Link to={PATHS.home} className="app-layout__title">
                        CareerLink
                    </Link>
                    {trail.length > 1 && (
                        <div className="app-layout__breadcrumb">
                            <Breadcrumb items={trail} />
                        </div>
                    )}
                </div>
                <UserMenu displayName={user?.displayName} role={role} onLogout={handleLogout} />
            </header>
            <div className="app-layout__body">
                <SideRail items={menus} />
                <div className="app-layout__main">
                    <BreadcrumbContext.Provider value={setPageTitle}>
                        <div key={pathname} className="app-layout__page">
                            <Outlet />
                        </div>
                    </BreadcrumbContext.Provider>
                </div>
            </div>
        </div>
    );
}

export default AppLayout;
