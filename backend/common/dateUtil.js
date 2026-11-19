// Date helpers. API dates are YYYY/MM/DD, API date-times are ISO 8601 with +09:00 (共通仕様 §2).
// Repositories convert DATETIME from the DB session time zone to JST before formatting.

// A real calendar date written as YYYY/MM/DD (2026/02/30 is rejected).
function isRealDate(value) {
    if (typeof value !== 'string' || !/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('/').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// 'YYYY/MM/DD' -> 'YYYY-MM-DD' (for SQL DATE).
const toDbDate = (apiDate) => apiDate.replace(/\//g, '-');

// 'YYYY-MM-DD' | null -> 'YYYY/MM/DD' | null.
const fromDbDate = (value) => (value ? String(value).slice(0, 10).replace(/-/g, '/') : null);

// 'YYYY-MM-DD HH:MM:SS[.ffffff]' | null -> '2026-10-26T09:30:00+09:00' | null.
const fromDbDateTime = (value) =>
    value ? `${String(value).slice(0, 19).replace(' ', 'T')}+09:00` : null;

module.exports = { isRealDate, toDbDate, fromDbDate, fromDbDateTime };
