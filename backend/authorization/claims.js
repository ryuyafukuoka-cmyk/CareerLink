// API Gateway が検証した JWT クレームを、アプリで使う Claims 型に変換する（F-002）。
// 取り出す項目は issuer、subject、adGroups、displayName。
const { config } = require('../common/config');

// グループは配列、API Gateway が配列を文字列化した "[a, b]"、またはカンマ区切りの文字列で届く。
// 前後の空白や空要素を取り除き、グループ名の配列を返す。
function parseGroups(value) {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value !== 'string') return [];
    const text = value.trim().replace(/^\[/, '').replace(/\]$/, '');
    return text
        .split(/[,\s]+/)
        .map((v) => v.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean);
}

// 発行者（iss）と利用者識別子（sub）がそろえば Claims を返す。どちらかが欠けていれば null を返す。
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
