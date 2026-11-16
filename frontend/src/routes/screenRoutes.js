// Route table for every screen ID (SC-XX-XX). 24 screen IDs, 23 implemented screens.
//
// access:
//   'public'              no login needed
//   'any'                 any logged-in role
//   ['admin', ...]        only these roles (the API still checks everything again)
//
// When a real screen is ready, add `element: <TheScreen />` to its entry.
// Entries without `element` show PlaceholderPage.
//
// SC-03-03 is the same implementation as SC-02-02 (shared detail screen).
// SC-05-01 is not used. SC-90-01 to 03 are shared UI parts, not routes.

import { ROLES } from '@shared/definitions';
import { PATHS } from './paths.js';

const { STUDENT, INSTRUCTOR, ADMIN } = ROLES;
const STAFF = [INSTRUCTOR, ADMIN];
const WRITERS = [STUDENT, ADMIN]; // instructors are read-only for records, rounds and progress

export const SCREENS = [
    { screenId: 'SC-00-01', name: 'ログイン', path: PATHS.login, access: 'public' },
    {
        screenId: 'SC-00-02',
        name: '認証・アクセス拒否',
        path: PATHS.accessDenied,
        access: 'public',
    },
    {
        screenId: 'SC-00-03',
        name: '初回卒業見込み年度',
        path: PATHS.firstRegistration,
        access: [STUDENT],
    },

    { screenId: 'SC-01-01', name: 'ホーム', path: PATHS.home, access: 'any' },

    { screenId: 'SC-02-01', name: '活動記録一覧', path: PATHS.records, access: 'any' },
    { screenId: 'SC-02-02', name: '活動記録詳細', path: PATHS.recordDetail, access: 'any' },
    { screenId: 'SC-02-03', name: '活動記録登録', path: PATHS.recordNew, access: WRITERS },
    { screenId: 'SC-02-03', name: '活動記録編集', path: PATHS.recordEdit, access: 'any' },
    { screenId: 'SC-02-04', name: '応募企業・選考進捗', path: PATHS.rounds, access: 'any' },
    { screenId: 'SC-02-05', name: '応募回別活動記録一覧', path: PATHS.roundDetail, access: 'any' },
    { screenId: 'SC-02-06', name: '応募回登録', path: PATHS.roundNew, access: WRITERS },
    { screenId: 'SC-02-07', name: '選考進捗編集', path: PATHS.roundEdit, access: WRITERS },

    { screenId: 'SC-03-01', name: '過去情報検索条件', path: PATHS.search, access: 'any' },
    { screenId: 'SC-03-02', name: '過去情報検索結果', path: PATHS.searchResults, access: 'any' },
    {
        screenId: 'SC-03-03',
        name: '過去活動記録詳細',
        path: PATHS.searchRecordDetail,
        access: 'any',
    },

    { screenId: 'SC-04-01', name: '企業一覧', path: PATHS.companies, access: 'any' },
    { screenId: 'SC-04-03', name: '企業登録', path: PATHS.companyNew, access: 'any' },
    { screenId: 'SC-04-02', name: '企業別カルテ', path: PATHS.companyDetail, access: 'any' },
    { screenId: 'SC-04-03', name: '企業編集', path: PATHS.companyEdit, access: 'any' },

    { screenId: 'SC-06-01', name: 'ユーザ一覧', path: PATHS.adminUsers, access: STAFF },
    { screenId: 'SC-06-02', name: 'ユーザ詳細・管理', path: PATHS.adminUserDetail, access: STAFF },
    {
        screenId: 'SC-06-03',
        name: '運用・データ管理',
        path: PATHS.adminOperations,
        access: STAFF,
    },
    { screenId: 'SC-06-04', name: '操作履歴', path: PATHS.adminLogs, access: STAFF },
    {
        screenId: 'SC-06-05',
        name: '卒業年度変更',
        path: PATHS.adminUserGraduationYear,
        access: STAFF,
    },
    { screenId: 'SC-06-06', name: 'ロール変更', path: PATHS.adminUserRole, access: [ADMIN] },
    {
        screenId: 'SC-06-07',
        name: '卒業・退校後下書き削除',
        path: PATHS.adminDraftCleanup,
        access: [ADMIN],
    },
];
