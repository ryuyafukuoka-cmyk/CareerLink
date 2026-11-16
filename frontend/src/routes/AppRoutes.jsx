import { Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/AppLayout/AppLayout.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import PlaceholderPage from './PlaceholderPage.jsx';
import RequireLogin from './RequireLogin.jsx';
import RequireRole from './RequireRole.jsx';
import { SCREEN_ELEMENTS } from './screenElements.jsx';
import { SCREENS } from './screenRoutes.js';

// Split the route table once: public / any logged-in role / one group per distinct role list.
const publicScreens = [];
const bareScreens = []; // logged in, role-limited, drawn without AppLayout
const anyRoleScreens = [];
const roleGroups = new Map(); // 'admin,instructor' -> { roles, screens }

for (const screen of SCREENS) {
    if (screen.access === 'public') {
        publicScreens.push(screen);
    } else if (screen.layout === 'bare') {
        bareScreens.push(screen);
    } else if (screen.access === 'any') {
        anyRoleScreens.push(screen);
    } else {
        const key = screen.access.join(',');
        if (!roleGroups.has(key)) roleGroups.set(key, { roles: screen.access, screens: [] });
        roleGroups.get(key).screens.push(screen);
    }
}

function renderScreen(screen) {
    return (
        <Route
            key={`${screen.screenId}:${screen.path}`}
            path={screen.path}
            element={SCREEN_ELEMENTS[screen.path] ?? <PlaceholderPage screen={screen} />}
        />
    );
}

function AppRoutes() {
    return (
        <Routes>
            {publicScreens.map(renderScreen)}
            <Route element={<RequireLogin />}>
                {bareScreens.map((screen) => (
                    <Route key={screen.screenId} element={<RequireRole roles={screen.access} />}>
                        {renderScreen(screen)}
                    </Route>
                ))}
                <Route element={<AppLayout />}>
                    {anyRoleScreens.map(renderScreen)}
                    {[...roleGroups].map(([key, group]) => (
                        <Route key={key} element={<RequireRole roles={group.roles} />}>
                            {group.screens.map(renderScreen)}
                        </Route>
                    ))}
                </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}

export default AppRoutes;
