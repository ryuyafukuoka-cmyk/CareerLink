// 開発用のモック認証。X-Mock-User ヘッダーのユーザーIDで操作ユーザーを決める。
//
// ログイン画面のテストには X-Mock-User の特別な値を使う。
// new-student は卒業年度が未登録の学生（初回登録画面 SC-00-03）。ineligible は403・NOT_ELIGIBLE。
// 無効なユーザー（userId 4）でログインすると403・ACCOUNT_INACTIVE を返す。

const { fail } = require('./helpers');

const NEW_STUDENT_ID = '100';

function authenticate(store) {
    return (req, res, next) => {
        const header = req.get('X-Mock-User');
        const isLogin = req.path === '/auth/login';

        if (!header) fail(401, 'UNAUTHORIZED');
        if (header === 'ineligible') {
            fail(403, 'FORBIDDEN', undefined, isLogin ? 'NOT_ELIGIBLE' : undefined);
        }

        if (header === 'new-student' && !store.getUser(NEW_STUDENT_ID)) {
            store.users.push({
                userId: NEW_STUDENT_ID,
                displayName: '新入生 次郎',
                role: 'student',
                graduationYear: null,
                status: 'active',
            });
        }
        const user = store.getUser(header === 'new-student' ? NEW_STUDENT_ID : header);
        if (!user) fail(401, 'UNAUTHORIZED');
        if (user.status === 'inactive') {
            fail(403, 'FORBIDDEN', undefined, isLogin ? 'ACCOUNT_INACTIVE' : undefined);
        }

        req.actor = user;
        next();
    };
}

module.exports = { authenticate };
