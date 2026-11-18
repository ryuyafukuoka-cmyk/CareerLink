// Date helpers. Dates are 'YYYY/MM/DD' strings (the API format); date-times are ISO 8601.

/** True for a real calendar date written as YYYY/MM/DD (2026/02/30 is false). */
export function isRealDate(value) {
    const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value ?? '');
    if (!match) return false;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** '2026-06-10T19:00:00+09:00' -> '2026/06/10 19:00' (browser time zone). Empty value -> '—'. */
export function formatDateTime(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
