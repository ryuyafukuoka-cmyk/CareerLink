import { generatePath, matchPath } from 'react-router-dom';
import { PATHS } from './paths.js';

// Breadcrumb trail for every screen. Each route names its label and its parent;
// the trail is found by walking up the parents. Keys starting with 'group:' are labels
// with no page of their own (shown as plain text).
// Parent patterns reuse the child's param names (recordId, roundId, companyId, userId).
const NODES = {
    'group:admin': { label: '管理', parent: PATHS.home },
    [PATHS.home]: { label: 'ホーム' },

    [PATHS.records]: { label: '活動記録', parent: PATHS.home },
    [PATHS.recordNew]: { label: '登録', parent: PATHS.records },
    [PATHS.recordDetail]: { label: '詳細', parent: PATHS.records },
    [PATHS.recordEdit]: { label: '編集', parent: PATHS.recordDetail },

    [PATHS.rounds]: { label: '応募企業・選考進捗', parent: PATHS.home },
    [PATHS.roundNew]: { label: '応募回登録', parent: PATHS.rounds },
    [PATHS.roundDetail]: { label: '応募回の活動記録', parent: PATHS.rounds },

    [PATHS.search]: { label: '過去情報検索', parent: PATHS.home },
    [PATHS.searchResults]: { label: '検索結果', parent: PATHS.search },
    [PATHS.searchRecordDetail]: { label: '記録詳細', parent: PATHS.searchResults },

    [PATHS.companies]: { label: '企業一覧', parent: PATHS.home },
    [PATHS.companyDetail]: { label: '企業詳細', parent: PATHS.companies },

    [PATHS.adminUsers]: { label: 'ユーザ管理', parent: 'group:admin' },
    [PATHS.adminUserDetail]: { label: 'ユーザ詳細', parent: PATHS.adminUsers },
    [PATHS.adminUserGraduationYear]: { label: '卒業年度の変更', parent: PATHS.adminUserDetail },
    [PATHS.adminUserRole]: { label: 'ロール変更', parent: PATHS.adminUserDetail },
    [PATHS.adminOperations]: { label: '運用・データ管理', parent: 'group:admin' },
    [PATHS.adminLogs]: { label: '操作履歴', parent: 'group:admin' },
    [PATHS.adminDraftCleanup]: { label: '下書き整理', parent: PATHS.adminOperations },
};

// Static patterns first, so '/records/new' is not taken for '/records/:recordId'.
const PATTERNS = Object.keys(NODES)
    .filter((key) => key.startsWith('/'))
    .sort((a, b) => Number(a.includes(':')) - Number(b.includes(':')));

/**
 * Trail for the current URL: [{ label, to? }], the last item being the current page.
 * @param {string} pathname
 * @param {{ backTo?: string } | null} [state] router location state. A search record detail
 *   goes back to the exact results page (conditions and page) it was opened from.
 * @returns {{ label: string, to?: string }[]}
 */
export function buildTrail(pathname, state) {
    let match = null;
    let pattern = null;
    for (const candidate of PATTERNS) {
        match = matchPath({ path: candidate, end: true }, pathname);
        if (match) {
            pattern = candidate;
            break;
        }
    }
    if (!pattern) return [];

    const trail = [{ label: NODES[pattern].label }];
    for (let key = NODES[pattern].parent; key; key = NODES[key].parent) {
        const isPage = key.startsWith('/');
        let to;
        if (isPage) {
            to = generatePath(key, match.params);
            if (key === PATHS.searchResults && state?.backTo) to = state.backTo;
        }
        trail.unshift({ label: NODES[key].label, to });
    }
    return trail;
}
