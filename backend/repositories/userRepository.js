// RDS access for users, user_auth, roles and user_roles (DB設計). SQL lives here only.
// Every function takes an optional `executor` (a transaction connection) as its last argument.
const { query } = require('../db/pool');
const { ROLES, USER_STATUSES } = require('../common/constants');

// ASSUMPTION: roles.role_name holds the Japanese names written in the DB design
// ("学生・指導員・管理者"). The DDL is still being written by the DB owner. If the seed data uses
// other values, change only these two maps.
const ROLE_NAME_BY_ROLE = Object.freeze({
    [ROLES.STUDENT]: '学生',
    [ROLES.INSTRUCTOR]: '指導員',
    [ROLES.ADMIN]: '管理者',
});
const ROLE_BY_ROLE_NAME = Object.freeze(
    Object.fromEntries(Object.entries(ROLE_NAME_BY_ROLE).map(([role, name]) => [name, role])),
);

const USER_SELECT = `
    SELECT u.users_id AS id, u.users_name AS name, u.graduation_year AS graduationYear,
           u.active AS active, r.role_name AS roleName
    FROM users u
    JOIN user_roles ur ON ur.users_id = u.users_id
    JOIN roles r ON r.role_id = ur.role_id`;

// DB row -> API `User` (userId is a string; graduationYear is number | null).
function toUser(row) {
    const role = ROLE_BY_ROLE_NAME[row.roleName];
    if (!role) throw new Error(`Unknown role_name in roles table: ${row.roleName}`);
    return {
        userId: String(row.id),
        displayName: row.name,
        role,
        graduationYear: row.graduationYear === null ? null : Number(row.graduationYear),
        status: Number(row.active) === 1 ? USER_STATUSES.ACTIVE : USER_STATUSES.INACTIVE,
    };
}

// Finds a user by the Cognito identity (issuer + sub). Returns User | null.
async function findByAuthIdentity(issuer, subject, executor) {
    const rows = await query(
        `${USER_SELECT}
         JOIN user_auth ua ON ua.users_id = u.users_id
         WHERE ua.auth_issuer = ? AND ua.auth_subject = ?`,
        [issuer, subject],
        executor,
    );
    return rows.length ? toUser(rows[0]) : null;
}

// Finds a user by internal id (number). Returns User | null.
async function findById(id, executor) {
    const rows = await query(`${USER_SELECT} WHERE u.users_id = ?`, [id], executor);
    return rows.length ? toUser(rows[0]) : null;
}

// filter: { role?, status?, graduationYear? } (already validated). Ordered by id.
async function list(filter = {}, executor) {
    const where = [];
    const params = [];
    if (filter.role) {
        where.push('r.role_name = ?');
        params.push(ROLE_NAME_BY_ROLE[filter.role]);
    }
    if (filter.status) {
        where.push('u.active = ?');
        params.push(filter.status === USER_STATUSES.ACTIVE ? 1 : 0);
    }
    if (filter.graduationYear !== undefined) {
        where.push('u.graduation_year = ?');
        params.push(filter.graduationYear);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(`${USER_SELECT} ${clause} ORDER BY u.users_id ASC`, params, executor);
    return rows.map(toUser);
}

// Creates users + user_auth + user_roles. Call inside one transaction (conn required).
// Throws the DB duplicate-key error if (issuer, sub) already exists. Returns the new internal id.
async function insertWithAuth(conn, { issuer, subject, displayName, role }) {
    const userResult = await query(
        'INSERT INTO users (users_name, graduation_year, active) VALUES (?, NULL, 1)',
        [displayName],
        conn,
    );
    const id = userResult.insertId;
    await query(
        'INSERT INTO user_auth (users_id, auth_issuer, auth_subject) VALUES (?, ?, ?)',
        [id, issuer, subject],
        conn,
    );
    const roleResult = await query(
        'INSERT INTO user_roles (users_id, role_id) SELECT ?, role_id FROM roles WHERE role_name = ?',
        [id, ROLE_NAME_BY_ROLE[role]],
        conn,
    );
    if (roleResult.affectedRows !== 1) {
        throw new Error(`roles table has no row for role_name ${ROLE_NAME_BY_ROLE[role]}`);
    }
    return id;
}

// Sets the graduation year only while it is still NULL. Returns true if it was set (U-02).
async function setGraduationYearIfUnset(id, year, executor) {
    const result = await query(
        'UPDATE users SET graduation_year = ? WHERE users_id = ? AND graduation_year IS NULL',
        [year, id],
        executor,
    );
    return result.affectedRows === 1;
}

async function updateGraduationYear(id, year, executor) {
    await query('UPDATE users SET graduation_year = ? WHERE users_id = ?', [year, id], executor);
}

async function updateStatus(id, status, executor) {
    await query(
        'UPDATE users SET active = ? WHERE users_id = ?',
        [status === USER_STATUSES.ACTIVE ? 1 : 0, id],
        executor,
    );
}

async function updateRole(id, role, executor) {
    await query(
        `UPDATE user_roles ur
         JOIN roles r ON r.role_name = ?
         SET ur.role_id = r.role_id
         WHERE ur.users_id = ?`,
        [ROLE_NAME_BY_ROLE[role], id],
        executor,
    );
}

// Role changes are serialized by locking the admin role row. MUST be the first statement of the
// transaction, so the reads after it see every earlier role change (F-001-02 排他制御).
async function lockRoleChanges(conn) {
    await query(
        'SELECT role_id FROM roles WHERE role_name = ? FOR UPDATE',
        [ROLE_NAME_BY_ROLE[ROLES.ADMIN]],
        conn,
    );
}

// Number of active admins.
async function countActiveAdmins(executor) {
    const rows = await query(
        `SELECT COUNT(*) AS n
         FROM users u
         JOIN user_roles ur ON ur.users_id = u.users_id
         JOIN roles r ON r.role_id = ur.role_id
         WHERE r.role_name = ? AND u.active = 1`,
        [ROLE_NAME_BY_ROLE[ROLES.ADMIN]],
        executor,
    );
    return Number(rows[0].n);
}

module.exports = {
    findByAuthIdentity,
    findById,
    list,
    insertWithAuth,
    setGraduationYearIfUnset,
    updateGraduationYear,
    updateStatus,
    updateRole,
    lockRoleChanges,
    countActiveAdmins,
};
