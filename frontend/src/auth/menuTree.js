import {
    ClipboardList,
    FileText,
    List,
    Plus,
    ScrollText,
    Search,
    Settings,
    Trash2,
    Building2,
    Users,
} from 'lucide-react';
import { ROLES } from '@shared/definitions';
import { PATHS } from '@/routes/paths.js';

const { STUDENT, INSTRUCTOR, ADMIN } = ROLES;
const ALL_ROLES = [STUDENT, INSTRUCTOR, ADMIN];
const STAFF = [INSTRUCTOR, ADMIN];
const WRITERS = [STUDENT, ADMIN]; // instructors are read-only for records and rounds

// Sidebar menu as a tree. A node with `children` is a group (opens and closes); a node with
// `path` is a link. `getVisibleMenus` in menus.js stays flat and is used by the home cards.
const MENU_TREE = [
    { id: 'home', label: 'ホーム', path: PATHS.home, roles: ALL_ROLES },
    {
        id: 'records',
        label: '活動記録',
        children: [
            {
                id: 'recordList',
                label: '活動記録一覧',
                path: PATHS.records,
                icon: List,
                roles: ALL_ROLES,
            },
            {
                id: 'recordNew',
                label: '活動記録を登録',
                path: PATHS.recordNew,
                icon: Plus,
                roles: WRITERS,
            },
        ],
    },
    {
        id: 'rounds',
        label: '応募企業・選考進捗',
        children: [
            {
                id: 'roundList',
                label: '応募企業一覧',
                path: PATHS.rounds,
                icon: ClipboardList,
                roles: ALL_ROLES,
            },
            {
                id: 'roundNew',
                label: '応募回を登録',
                path: PATHS.roundNew,
                icon: Plus,
                roles: WRITERS,
            },
        ],
    },
    {
        id: 'lookup',
        label: '過去情報・企業',
        children: [
            {
                id: 'search',
                label: '過去情報検索',
                path: PATHS.search,
                icon: Search,
                roles: ALL_ROLES,
            },
            {
                id: 'companyList',
                label: '企業一覧',
                path: PATHS.companies,
                icon: Building2,
                roles: ALL_ROLES,
            },
            {
                id: 'companyNew',
                label: '企業を登録',
                path: PATHS.companyNew,
                icon: Plus,
                roles: ALL_ROLES,
            },
        ],
    },
    {
        id: 'admin',
        label: '管理',
        children: [
            {
                id: 'adminUsers',
                label: 'ユーザ管理',
                path: PATHS.adminUsers,
                icon: Users,
                roles: STAFF,
            },
            {
                id: 'adminOperations',
                label: '運用・データ管理',
                path: PATHS.adminOperations,
                icon: Settings,
                roles: STAFF,
            },
            {
                id: 'adminLogs',
                label: '操作履歴',
                path: PATHS.adminLogs,
                icon: ScrollText,
                roles: STAFF,
            },
            {
                id: 'adminDraftCleanup',
                label: '下書き整理',
                path: PATHS.adminDraftCleanup,
                icon: Trash2,
                roles: [ADMIN],
            },
        ],
    },
];

const toLeaf = (node) => ({ value: node.id, label: node.label, to: node.path, icon: node.icon });

/**
 * Menu tree for a role, in the shape BranchedMenu expects.
 * Display control only, never a replacement for API permission checks.
 * Groups with no visible child are dropped.
 */
export function getMenuTree(role) {
    if (!role) return [];
    const items = [];
    for (const node of MENU_TREE) {
        if (node.children) {
            const children = node.children
                .filter((child) => child.roles.includes(role))
                .map(toLeaf);
            if (children.length > 0) items.push({ id: node.id, label: node.label, children });
        } else if (node.roles.includes(role)) {
            items.push(toLeaf(node));
        }
    }
    return items;
}
