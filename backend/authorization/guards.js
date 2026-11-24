// 権限チェック（F-002-03）。条件を満たさない場合は AppError を投げる。
// 判定にはリクエストごとに RDS から取得したユーザーの権限と状態を使う。
const { forbidden } = require('../common/errors');

// 操作するユーザーが許可された権限を持たなければ FORBIDDEN を返す。
function requireRole(actor, allowedRoles) {
    if (!allowedRoles.includes(actor.role)) throw forbidden();
}

// データの所有者（userId が一致）または許可された権限を持つユーザーに操作を認める。
function requireOwnerOrRole(actor, ownerUserId, allowedRoles) {
    if (actor.userId === ownerUserId) return;
    requireRole(actor, allowedRoles);
}

module.exports = { requireRole, requireOwnerOrRole };
