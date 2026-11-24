// 本番用の認証。JWT の署名・有効期限・発行者・対象者は API Gateway の JWT オーソライザーが検証する。
// アプリでは検証済みのクレームを読み取り、req.claims に設定する。
// 利用可能なクレームがなければ 401 を返す。
const { unauthorized } = require('../common/errors');
const { buildClaims } = require('./claims');

// Lambda の呼び出しイベントを @codegenie/serverless-express から取得する。
// ローカルサーバーでは使わないため、この関数を呼び出したときに読み込む。
function readGatewayClaims() {
    const { getCurrentInvoke } = require('@codegenie/serverless-express');
    const event = getCurrentInvoke()?.event;
    // HTTP API のペイロード形式 v2 では、検証済みクレームは requestContext.authorizer.jwt.claims に入る。
    return event?.requestContext?.authorizer?.jwt?.claims ?? null;
}

function authenticate(req, res, next) {
    const claims = buildClaims(readGatewayClaims());
    if (!claims) return next(unauthorized());
    req.claims = claims;
    return next();
}

module.exports = { authenticate };
