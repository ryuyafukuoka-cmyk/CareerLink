// Date helpers. Dates are 'YYYY/MM/DD' strings (the API format); date-times are ISO 8601.

/** True for a real calendar date written as YYYY/MM/DD (2026/02/30 is false). */
export function isRealDate(value) {
    const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value ?? '');
    if (!match) return false;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

const jstDateTime = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

/** Format an API timestamp as YYYY/MM/DD HH:mm in Japan Standard Time. */
export function formatDateTime(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '—' : jstDateTime.format(date);
}
