// users、user_auth、roles、user_roles のSQLをまとめる（DB設計）。末尾の任意引数 executor にトランザクション接続を渡せる。
const { query } = require('../db/pool');
const { ROLES, USER_STATUSES } = require('../common/constants');

// roles.role_name にはDB設計の日本語名（学生・指導員・管理者）が入る想定。
// DB担当が用意する初期データの値が異なる場合は、次の2つの対応表を変更する。
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

// DBの行をAPIの User に変換する。userId は文字列、graduationYear は数値または null。
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

// Cognito の識別情報（issuer と sub）でユーザーを取得する。該当しなければ null を返す。
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

// 数値の内部IDでユーザーを取得する。該当しなければ null を返す。
async function findById(id, executor) {
    const rows = await query(`${USER_SELECT} WHERE u.users_id = ?`, [id], executor);
    return rows.length ? toUser(rows[0]) : null;
}

// 検証済みの任意条件 role、status、graduationYear で絞り込み、ID順に返す。
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

// users・user_auth・user_roles に1トランザクションで登録し、新しい内部IDを返す（conn 必須）。
// 同じ issuer と sub がすでにあれば、DBのキー重複エラーを投げる。
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

// U-02。卒業年度が NULL の間だけ登録できる。実際に登録したら true を返す。
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

// 権限変更を順に処理するため、トランザクションの最初のSQLで管理者ロールの行をロックする。
// これ以降の読み取りに先行する権限変更が反映される（F-001-02 排他制御）。
async function lockRoleChanges(conn) {
    await query(
        'SELECT role_id FROM roles WHERE role_name = ? FOR UPDATE',
        [ROLE_NAME_BY_ROLE[ROLES.ADMIN]],
        conn,
    );
}

// 有効な管理者の人数。
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
