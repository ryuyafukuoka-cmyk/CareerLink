import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '@shared/definitions';
import { getVisibleMenus } from '@/auth/menus.js';
import { useAuth } from '@/auth/useAuth.js';
import Button from '@/components/Button/Button.jsx';
import { PATHS } from '@/routes/paths.js';
import { classNames } from '@/utils/classNames.js';
import './AppLayout.css';

// Frame for every logged-in screen: header (title, user, role, logout), side menu, page area.
// Used as a layout route, so each screen is drawn in <Outlet />.
function AppLayout() {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();
    const menus = getVisibleMenus(role);

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
                    <ul className="app-layout__menu">
                        {menus.map((menu) => (
                            <li key={menu.id}>
                                <NavLink
                                    to={menu.path}
                                    end={menu.path === PATHS.home}
                                    className={({ isActive }) =>
                                        classNames(
                                            'app-layout__link',
                                            isActive && 'app-layout__link--active',
                                        )
                                    }
                                >
                                    {menu.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="app-layout__main">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default AppLayout;
