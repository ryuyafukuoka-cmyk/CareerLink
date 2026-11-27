// ログインAPI（A-01）。F-002-01 の handleLogin と F-001-01 の resolveUserOnLogin に対応する。
const { config } = require('../common/config');
const { ROLES, USER_STATUSES } = require('../common/constants');
const { forbidden } = require('../common/errors');
const { withTransaction, isDuplicateEntry } = require('../db/pool');
const userRepository = require('../repositories/userRepository');

// 初回の権限は学校ADの所属グループで決める（学生→student、指導員→instructor）。
// 両方に所属する場合と、どちらにも所属しない場合は null を返してログインを拒否する。管理者権限は自動付与しない。
function determineInitialRole(adGroups) {
    const isStudent = adGroups.includes(config.auth.studentGroup);
    const isInstructor = adGroups.includes(config.auth.instructorGroup);
    if (isStudent === isInstructor) return null;
    return isStudent ? ROLES.STUDENT : ROLES.INSTRUCTOR;
}

// 学生の卒業年度が未登録なら、2回目以降のログインでも初回登録画面を表示する。モックでも同じ条件を使う。
function isFirstLoginFor(user, created) {
    return created || (user.role === ROLES.STUDENT && user.graduationYear === null);
}

// issuer、subject、adGroups、displayName を含むクレームを受け取り、{ user, isFirstLogin } を返す。
async function handleLogin(claims) {
    const existing = await userRepository.findByAuthIdentity(claims.issuer, claims.subject);
    if (existing) {
        // 登録済みのユーザーは RDS の情報を使う。ログインによる再登録や再有効化は行わない。
        if (existing.status !== USER_STATUSES.ACTIVE) throw forbidden('ACCOUNT_INACTIVE');
        return { user: existing, isFirstLogin: isFirstLoginFor(existing, false) };
    }

    // 未登録なら、ADグループで利用対象と判定したユーザーだけを登録する。
    const role = determineInitialRole(claims.adGroups);
    if (!role) throw forbidden('NOT_ELIGIBLE');

    try {
        const user = await withTransaction(async (conn) => {
            await userRepository.insertWithAuth(conn, {
                issuer: claims.issuer,
                subject: claims.subject,
                displayName: claims.displayName || '名称未設定',
                role,
            });
            return userRepository.findByAuthIdentity(claims.issuer, claims.subject, conn);
        });
        return { user, isFirstLogin: isFirstLoginFor(user, true) };
    } catch (err) {
        if (!isDuplicateEntry(err)) throw err;
        // 初回ログインが重なり、別のリクエストが先に登録したユーザーを取得する。
        const user = await userRepository.findByAuthIdentity(claims.issuer, claims.subject);
        if (!user) throw err;
        if (user.status !== USER_STATUSES.ACTIVE) throw forbidden('ACCOUNT_INACTIVE');
        return { user, isFirstLogin: isFirstLoginFor(user, false) };
    }
}

module.exports = { handleLogin, determineInitialRole };
