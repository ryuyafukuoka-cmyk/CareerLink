// APIの日付は YYYY/MM/DD、日時は +09:00 付きの ISO 8601 形式（共通仕様 §2）。
// リポジトリ側で DATETIME をDBセッションのタイムゾーンから日本時間に変換してから整形する。

// YYYY/MM/DD 形式で、実在する日付かを判定する（例：2026/02/30 は無効）。
function isRealDate(value) {
    if (typeof value !== 'string' || !/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('/').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// YYYY/MM/DD を SQL の DATE 用に YYYY-MM-DD に変換する。
const toDbDate = (apiDate) => apiDate.replace(/\//g, '-');

// YYYY-MM-DD を YYYY/MM/DD に変換する。null はそのまま返す。
const fromDbDate = (value) => (value ? String(value).slice(0, 10).replace(/-/g, '/') : null);

// 日本時間のDB日時（マイクロ秒は任意）を +09:00 付きの日時に整形する。null はそのまま返す。
const fromDbDateTime = (value) =>
    value ? `${String(value).slice(0, 19).replace(' ', 'T')}+09:00` : null;

module.exports = { isRealDate, toDbDate, fromDbDate, fromDbDateTime };
