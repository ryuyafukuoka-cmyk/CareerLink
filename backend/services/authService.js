// Login (F-002-01 handleLogin + F-001-01 resolveUserOnLogin). Only A-01 is implemented here.
const { config } = require('../common/config');
const { ROLES, USER_STATUSES } = require('../common/constants');
const { forbidden } = require('../common/errors');
const { withTransaction, isDuplicateEntry } = require('../db/pool');
const userRepository = require('../repositories/userRepository');

// First role comes from the school AD group (student group -> student, instructor group ->
// instructor). Returns null when the groups cannot decide (none, or both): the login is refused
// (safe side). Admin is never granted automatically.
function determineInitialRole(adGroups) {
    const isStudent = adGroups.includes(config.auth.studentGroup);
    const isInstructor = adGroups.includes(config.auth.instructorGroup);
    if (isStudent === isInstructor) return null;
    return isStudent ? ROLES.STUDENT : ROLES.INSTRUCTOR;
}

// A student who has not entered a graduation year yet still needs the first-registration screen,
// even on a later login (same rule the mock server uses).
function isFirstLoginFor(user, created) {
    return created || (user.role === ROLES.STUDENT && user.graduationYear === null);
}

// claims: { issuer, subject, adGroups, displayName } -> { user, isFirstLogin }
async function handleLogin(claims) {
    const existing = await userRepository.findByAuthIdentity(claims.issuer, claims.subject);
    if (existing) {
        // Existing users: RDS is the source of truth. Never re-activate or re-register.
        if (existing.status !== USER_STATUSES.ACTIVE) throw forbidden('ACCOUNT_INACTIVE');
        return { user: existing, isFirstLogin: isFirstLoginFor(existing, false) };
    }

    // Unregistered: only an eligible person (decided by AD group for now) is created.
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
        // Simultaneous first logins: another request created the user. Use that one.
        const user = await userRepository.findByAuthIdentity(claims.issuer, claims.subject);
        if (!user) throw err;
        if (user.status !== USER_STATUSES.ACTIVE) throw forbidden('ACCOUNT_INACTIVE');
        return { user, isFirstLogin: isFirstLoginFor(user, false) };
    }
}

module.exports = { handleLogin, determineInitialRole };
