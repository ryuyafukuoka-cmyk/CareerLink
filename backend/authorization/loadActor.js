// 認証が必要なルートでは authenticate の後に RDS から操作ユーザーの情報を取得する。
// 確認順序（F-002-03）は、JWT（API Gateway）→ アカウント状態 → 権限 → 所有者・データの状態。
// ここでは未登録・無効のユーザーに FORBIDDEN を返す。ログインルートは初回登録を扱うため、
// 別途判定し、対象外なら NOT_ELIGIBLE、無効なら ACCOUNT_INACTIVE を返す。
const { forbidden } = require('../common/errors');
const { USER_STATUSES } = require('../common/constants');
const userRepository = require('../repositories/userRepository');

async function loadActor(req, res, next) {
    const user = await userRepository.findByAuthIdentity(req.claims.issuer, req.claims.subject);
    if (!user || user.status !== USER_STATUSES.ACTIVE) throw forbidden();
    // Actor は認証済みユーザーの userId と、RDS に保存された権限で構成する（F-001）。
    req.actor = { userId: user.userId, role: user.role };
    req.user = user; // U-01 のレスポンスで使うユーザー情報全体。
    next();
}

module.exports = { loadActor };
