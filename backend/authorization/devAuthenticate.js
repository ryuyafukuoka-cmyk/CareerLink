// LOCAL DEVELOPMENT ONLY. Used by server.js, never by lambda.js (詳細設計 要確認3: 開発用モック認証を
// 本番へ持ち込まない). It refuses to run when NODE_ENV=production.
//
// Fake claims come from request headers (no real JWT is checked):
//   X-Dev-Sub     required  stands for the Cognito `sub` (one value = one person)
//   X-Dev-Groups  optional  AD group list, e.g. "student" or "instructor" (used on first login only)
//   X-Dev-Name    optional  display name (used on first login only)
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
