// server.js が使うローカル開発専用の認証。Lambda には組み込まない（詳細設計の要確認3）。
// NODE_ENV=production で呼び出すとエラーにする。
//
// JWT の検証を省き、次のリクエストヘッダーから開発用のクレームを作る。
//   X-Dev-Sub     必須。Cognito の sub に相当する、ユーザーごとに固有の識別子。
//   X-Dev-Groups  任意。初回ログイン時の権限判定に使う AD グループ（例：student、instructor）。
//   X-Dev-Name    任意。初回ログイン時に登録する表示名。
const { unauthorized } = require('../common/errors');
const { parseGroups } = require('./claims');

const DEV_ISSUER = 'https://dev.local/careerlink';

function devAuthenticate(req, res, next) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('devAuthenticate must not be used in production');
    }
    const subject = req.get('X-Dev-Sub');
    if (!subject) return next(unauthorized());
    req.claims = {
        issuer: DEV_ISSUER,
        subject,
        adGroups: parseGroups(req.get('X-Dev-Groups') ?? ''),
        displayName: req.get('X-Dev-Name') || `dev-${subject}`,
    };
    return next();
}

module.exports = { devAuthenticate };
