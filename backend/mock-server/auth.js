// Dev-only mock authentication. The acting user is chosen with the `X-Mock-User` header (a userId).
//
// Special values for testing the login screens:
//   X-Mock-User: new-student   -> a student with no graduation year yet (first login, SC-00-03)
//   X-Mock-User: ineligible    -> 403 FORBIDDEN, reason NOT_ELIGIBLE
// An inactive user (userId 4) gets 403 FORBIDDEN, reason ACCOUNT_INACTIVE on login.

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
