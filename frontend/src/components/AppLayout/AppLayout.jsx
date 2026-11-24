import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '@shared/definitions';
import { getMenuTree } from '@/auth/menuTree.js';
import { useAuth } from '@/auth/useAuth.js';
import BranchedMenu from '@/components/BranchedMenu/BranchedMenu.jsx';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb.jsx';
import Button from '@/components/Button/Button.jsx';
import { buildTrail } from '@/routes/breadcrumbs.js';
import { PATHS } from '@/routes/paths.js';
import { BreadcrumbContext } from './BreadcrumbContext.js';
import './AppLayout.css';

// Frame for every logged-in screen: header (title, user, role, logout), branched side menu,
// breadcrumb (always shown above the page), page area.
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
                <Link to={PATHS.home} className="app-layout__title">
                    CareerLink
                </Link>
                <div className="app-layout__user">
                    <span className="app-layout__user-name">{user?.displayName}</span>
                    <span className="app-layout__role">{ROLE_LABELS[role]}</span>
                    <Button variant="secondary" onClick={handleLogout}>
                        ログアウト
                    </Button>
                </div>
            </header>
            <div className="app-layout__body">
                <nav className="app-layout__sidebar" aria-label="メインメニュー">
                    <BranchedMenu items={menus} />
                </nav>
                <div className="app-layout__main">
                    {trail.length > 1 && (
                        <div className="app-layout__breadcrumb">
                            <Breadcrumb items={trail} />
                        </div>
                    )}
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
