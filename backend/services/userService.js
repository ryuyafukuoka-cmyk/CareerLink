// User services (F-001-01). U-01 to U-07.
const { ROLES, ROLE_VALUES, USER_STATUS_VALUES } = require('../common/constants');
const { conflict, forbidden, notFound } = require('../common/errors');
const { assertGraduationYear, assertOneOf, parseId } = require('../common/validation');
const { requireRole, requireOwnerOrRole } = require('../authorization/guards');
const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const { recordOperationLog } = require('../repositories/operationLogRepository');

// registerGraduationYear: a student sets their own graduation year once (U-02).
// Order: role (403) -> value (400) -> already set (409, decided atomically by the UPDATE).
async function registerGraduationYear(actor, year) {
    requireRole(actor, [ROLES.STUDENT]);
    assertGraduationYear(year);
    const wasSet = await userRepository.setGraduationYearIfUnset(Number(actor.userId), year);
    if (!wasSet) throw conflict();
    return userRepository.findById(Number(actor.userId));
}

// listUsers (U-03): instructor / admin only. query = req.query (all values are strings).
async function listUsers(actor, query = {}) {
    requireRole(actor, [ROLES.INSTRUCTOR, ROLES.ADMIN]);
    const filter = {};
    if (query.role !== undefined) {
        assertOneOf(query.role, ROLE_VALUES, 'role');
        filter.role = query.role;
    }
    if (query.status !== undefined) {
        assertOneOf(query.status, USER_STATUS_VALUES, 'status');
        filter.status = query.status;
    }
    if (query.graduationYear !== undefined) {
        const year = /^\d{1,4}$/.test(query.graduationYear) ? Number(query.graduationYear) : NaN;
        assertGraduationYear(year, 'graduationYear');
        filter.graduationYear = year;
    }
    return userRepository.list(filter);
}

// getUserProfile (U-04): the person themself, or an instructor / admin.
// The permission check comes first, so a student cannot learn whether another id exists.
async function getUserProfile(actor, userIdParam) {
    requireOwnerOrRole(actor, userIdParam, [ROLES.INSTRUCTOR, ROLES.ADMIN]);
    const id = parseId(userIdParam);
    if (id === null) throw notFound();
    const user = await userRepository.findById(id);
    if (!user) throw notFound();
    return user;
}

// Loads a target that must be an existing student; otherwise 404.
async function findStudentOr404(userIdParam) {
    const id = parseId(userIdParam);
    if (id === null) throw notFound();
    const target = await userRepository.findById(id);
    if (!target || target.role !== ROLES.STUDENT) throw notFound();
    return { id, target };
}

// updateGraduationYear (U-05): instructor / admin change a student's year.
async function updateGraduationYear(actor, userIdParam, year) {
    requireRole(actor, [ROLES.INSTRUCTOR, ROLES.ADMIN]);
    assertGraduationYear(year);
    const { id } = await findStudentOr404(userIdParam);
    await userRepository.updateGraduationYear(id, year);
    return userRepository.findById(id);
}

// Log each authenticated attempt, including successful requests that repeat the current value.
async function withUserChangeLog(actor, userIdParam, operationType, change) {
    const id = parseId(userIdParam);
    const entry = {
        operatorUserId: actor.userId,
        operationType,
        targetType: 'user',
        targetId: id !== null && id <= 0xffffffff ? id : null,
    };
    try {
        return await withTransaction(async (conn) => {
            const user = await change(id, conn);
            await recordOperationLog({ ...entry, result: 'success' }, conn);
            return user;
        });
    } catch (error) {
        // The transaction has rolled back. Keep the original API error if logging also fails.
        try {
            await recordOperationLog({ ...entry, result: 'failure' });
        } catch {
            console.error('Failed to save user management failure log:', operationType);
        }
        throw error;
    }
}

// Both operations check the target's current role under the same lock before changing it.
async function getUserForManagement(actor, id, conn) {
    if (id === null) throw notFound();
    if (String(id) === actor.userId) throw forbidden();
    await userRepository.lockRoleChanges(conn); // first SQL statement in the transaction
    const target = await userRepository.findById(id, conn);
    if (!target) throw notFound();
    return target;
}

// U-07: instructors and admins may enable or disable a student.
async function setUserStatus(actor, userIdParam, status) {
    return withUserChangeLog(actor, userIdParam, 'setStatus', async (id, conn) => {
        requireRole(actor, [ROLES.INSTRUCTOR, ROLES.ADMIN]);
        assertOneOf(status, USER_STATUS_VALUES, 'status');
        const target = await getUserForManagement(actor, id, conn);
        if (target.role !== ROLES.STUDENT) throw forbidden();
        if (target.status === status) return target;

        await userRepository.updateStatus(id, status, conn);
        return userRepository.findById(id, conn);
    });
}

// U-06: admins may change another user's role while retaining at least one active admin.
async function changeUserRole(actor, userIdParam, newRole) {
    return withUserChangeLog(actor, userIdParam, 'changeRole', async (id, conn) => {
        requireRole(actor, [ROLES.ADMIN]);
        assertOneOf(newRole, ROLE_VALUES, 'role');
        const target = await getUserForManagement(actor, id, conn);
        if (target.role === newRole) return target;

        if (target.role === ROLES.ADMIN) {
            const activeAdmins = await userRepository.countActiveAdmins(conn);
            const remaining = activeAdmins - (target.status === 'active' ? 1 : 0);
            if (remaining < 1) throw conflict();
        }
        await userRepository.updateRole(id, newRole, conn);
        return userRepository.findById(id, conn);
    });
}

module.exports = {
    registerGraduationYear,
    listUsers,
    getUserProfile,
    updateGraduationYear,
    setUserStatus,
    changeUserRole,
};
