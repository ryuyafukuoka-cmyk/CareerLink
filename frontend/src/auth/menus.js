import { ROLES } from '@shared/definitions';
import { PATHS } from '@/routes/paths.js';

const { STUDENT, INSTRUCTOR, ADMIN } = ROLES;
const ALL_ROLES = [STUDENT, INSTRUCTOR, ADMIN];
const STAFF = [INSTRUCTOR, ADMIN];

const MENUS = [
    { id: 'home', label: 'ホーム', path: PATHS.home, roles: ALL_ROLES },
    { id: 'records', label: '活動記録', path: PATHS.records, roles: ALL_ROLES },
    { id: 'rounds', label: '応募企業・選考進捗', path: PATHS.rounds, roles: ALL_ROLES },
    { id: 'search', label: '過去情報検索', path: PATHS.search, roles: ALL_ROLES },
    { id: 'companies', label: '企業', path: PATHS.companies, roles: ALL_ROLES },
    { id: 'adminUsers', label: 'ユーザ管理', path: PATHS.adminUsers, roles: STAFF },
    { id: 'adminOperations', label: '運用・データ管理', path: PATHS.adminOperations, roles: STAFF },
    { id: 'adminLogs', label: '操作履歴', path: PATHS.adminLogs, roles: STAFF },
];

/**
 * Menu items to show for a role. Display control only, never a replacement for API permission checks.
 * @param {string | null | undefined} role 'student' | 'instructor' | 'admin'
 * @returns {{ id: string, label: string, path: string }[]}
 */
export function getVisibleMenus(role) {
    if (!role) return [];
    return MENUS.filter((menu) => menu.roles.includes(role)).map(({ id, label, path }) => ({
        id,
        label,
        path,
    }));
}
