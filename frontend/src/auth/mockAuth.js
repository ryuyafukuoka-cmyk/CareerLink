// DEV ONLY mock login. Delete on 12/21 together with components/DevRoleSwitcher
// and the mock branches in AuthProvider.jsx.
//
// The mock server picks the acting user from the `X-Mock-User` header.

export const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

const STORAGE_KEY = 'careerlink.mockUser';

// Keys the mock server understands (see backend/バックエンドメモ.md).
export const MOCK_LOGIN_OPTIONS = [
    { key: '1', label: '学生：山田 太郎（2027）' },
    { key: '2', label: '学生：佐藤 花子（2027）' },
    { key: '3', label: '学生：鈴木 一郎（2028）' },
    { key: 'new-student', label: '学生：初回ログイン（年度未設定）' },
    { key: '4', label: '学生：高橋 健（無効）' },
    { key: '5', label: '指導員：宮本' },
    { key: '6', label: '指導員：中村' },
    { key: '7', label: '管理者：管理者 太郎' },
    { key: 'ineligible', label: '利用対象外アカウント' },
];

// Storage can be blocked, so every access is guarded.
export function getStoredMockUserKey() {
    try {
        return sessionStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function setStoredMockUserKey(key) {
    try {
        sessionStorage.setItem(STORAGE_KEY, key);
    } catch {
        // ignore: the session just will not survive a reload
    }
}

export function clearStoredMockUserKey() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
