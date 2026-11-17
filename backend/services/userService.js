// User services (F-001-01). U-01 to U-07.
const { ROLES, ROLE_VALUES, USER_STATUS_VALUES } = require('../common/constants');
const { conflict, forbidden, notFound } = require('../common/errors');
const { assertGraduationYear, assertOneOf, parseId } = require('../common/validation');
const { requireRole, requireOwnerOrRole } = require('../authorization/guards');
const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');

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

// setUserStatus (U-07): instructor / admin enable or disable a student. Nothing is deleted.
// Order: role (403) -> value (400) -> self (403) -> missing (404) -> not a student (403).
async function setUserStatus(actor, userIdParam, status) {
    requireRole(actor, [ROLES.INSTRUCTOR, ROLES.ADMIN]);
    assertOneOf(status, USER_STATUS_VALUES, 'status');
    const id = parseId(userIdParam);
    if (id === null) throw notFound();
    if (String(id) === actor.userId) throw forbidden();
    const target = await userRepository.findById(id);
    if (!target) throw notFound();
    if (target.role !== ROLES.STUDENT) throw forbidden();
    await userRepository.updateStatus(id, status);
    return userRepository.findById(id);
}

// changeUserRole (U-06): admin only. Never yourself (403), and never so that no active admin
// remains (409). The check and the change run in one transaction that starts by locking the admin
// role row, so two admins cannot demote each other at the same moment.
async function changeUserRole(actor, userIdParam, newRole) {
    requireRole(actor, [ROLES.ADMIN]);
    assertOneOf(newRole, ROLE_VALUES, 'role');
    const id = parseId(userIdParam);
    if (id === null) throw notFound();
    if (String(id) === actor.userId) throw forbidden();

    return withTransaction(async (conn) => {
        await userRepository.lockRoleChanges(conn); // must stay the first statement
        const target = await userRepository.findById(id, conn);
        if (!target) throw notFound();
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
