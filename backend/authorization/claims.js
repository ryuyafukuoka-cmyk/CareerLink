// Turns the raw JWT claims (already verified by the API Gateway JWT authorizer) into the small
// `Claims` object the app uses: { issuer, subject, adGroups, displayName } (F-002 型).
const { config } = require('../common/config');

// The group claim may arrive as an array, a JSON-like string "[a, b]" (API Gateway stringifies
// array claims), or a comma-separated string. Always returns a clean string[].
function parseGroups(value) {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value !== 'string') return [];
    const text = value.trim().replace(/^\[/, '').replace(/\]$/, '');
    return text
        .split(/[,\s]+/)
        .map((v) => v.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean);
}

// Returns Claims, or null when the token has no usable identity (issuer + subject).
function buildClaims(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const issuer = typeof raw.iss === 'string' ? raw.iss : '';
    const subject = typeof raw.sub === 'string' ? raw.sub : '';
    if (!issuer || !subject) return null;

    const nameValue = raw[config.auth.displayNameClaim] ?? raw['cognito:username'];
    return {
        issuer,
        subject,
        adGroups: parseGroups(raw[config.auth.groupsClaim]),
        displayName: typeof nameValue === 'string' ? nameValue.trim() : '',
    };
}

module.exports = { buildClaims, parseGroups };
