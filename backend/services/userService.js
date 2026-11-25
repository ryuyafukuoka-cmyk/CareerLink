// ユーザー管理サービス（F-001-01、U-01〜U-07）。
const { ROLES, ROLE_VALUES, USER_STATUS_VALUES } = require('../common/constants');
const { conflict, forbidden, notFound } = require('../common/errors');
const { assertGraduationYear, assertOneOf, parseId } = require('../common/validation');
const { requireRole, requireOwnerOrRole } = require('../authorization/guards');
const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const { recordOperationLog } = require('../repositories/operationLogRepository');

// U-02 registerGraduationYear。学生は自分の卒業年度を1回だけ登録できる。
// 権限（403）、入力値（400）の順に検証し、登録済みか（409）は UPDATE で原子的に判定する。
async function registerGraduationYear(actor, year) {
    requireRole(actor, [ROLES.STUDENT]);
    assertGraduationYear(year);
    const wasSet = await userRepository.setGraduationYearIfUnset(Number(actor.userId), year);
    if (!wasSet) throw conflict();
    return userRepository.findById(Number(actor.userId));
}

// U-03 listUsers。指導員・管理者のみ。req.query の絞り込み条件を受け取る（各値は文字列）。
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

// U-04 getUserProfile。本人・指導員・管理者のみ。学生が他のIDの存在を推測できないよう、先に権限を確認する。
async function getUserProfile(actor, userIdParam) {
    requireOwnerOrRole(actor, userIdParam, [ROLES.INSTRUCTOR, ROLES.ADMIN]);
    const id = parseId(userIdParam);
    if (id === null) throw notFound();
    const user = await userRepository.findById(id);
    if (!user) throw notFound();
    return user;
}

// 操作対象の学生を取得する。該当する学生が存在しなければ404を返す。
async function findStudentOr404(userIdParam) {
    const id = parseId(userIdParam);
    if (id === null) throw notFound();
    const target = await userRepository.findById(id);
    if (!target || target.role !== ROLES.STUDENT) throw notFound();
    return { id, target };
}

// U-05 updateGraduationYear。指導員と管理者が学生の卒業年度を変更する。
async function updateGraduationYear(actor, userIdParam, year) {
    requireRole(actor, [ROLES.INSTRUCTOR, ROLES.ADMIN]);
    assertGraduationYear(year);
    const { id } = await findStudentOr404(userIdParam);
    await userRepository.updateGraduationYear(id, year);
    return userRepository.findById(id);
}

// 認証済みの操作を試行ごとに記録する。現在と同じ値を指定して成功した場合も含む。
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
        // トランザクションはロールバック済み。失敗ログの記録にも失敗した場合は、元のAPIエラーを維持する。
        try {
            await recordOperationLog({ ...entry, result: 'failure' });
        } catch {
            console.error('Failed to save user management failure log:', operationType);
        }
        throw error;
    }
}

// どちらの変更でも同じロックを取得し、対象ユーザーの現在の権限を確認してから更新する。
async function getUserForManagement(actor, id, conn) {
    if (id === null) throw notFound();
    if (String(id) === actor.userId) throw forbidden();
    await userRepository.lockRoleChanges(conn); // トランザクション内で最初に実行するSQL。
    const target = await userRepository.findById(id, conn);
    if (!target) throw notFound();
    return target;
}

// U-07。指導員と管理者は学生の利用状態を有効または無効に変更できる。
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

// U-06。管理者は他のユーザーの権限を変更できる。有効な管理者を少なくとも1人残す。
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
