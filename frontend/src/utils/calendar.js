// Calendar date helpers for Calendar / DatePicker. Dates are local-midnight Date objects;
// the API string form is YYYY/MM/DD.
import { isRealDate } from '@/utils/date.js';

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const pad = (value) => String(value).padStart(2, '0');

export function formatDate(date) {
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

/** 'YYYY/MM/DD' -> Date, or null when it is not a real date. */
export function parseDate(value) {
    if (!isRealDate(value)) return null;
    const [year, month, day] = value.split('/').map(Number);
    return new Date(year, month - 1, day);
}

export function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date, amount) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/** Move by whole months; the day is clamped (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date, amount) {
    const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

export function isSameDay(a, b) {
    return Boolean(a && b) && formatDate(a) === formatDate(b);
}

/** True when the date is outside the optional min / max range. */
export function isOutOfRange(date, min, max) {
    const key = formatDate(date);
    return Boolean((min && key < formatDate(min)) || (max && key > formatDate(max)));
}

/** 6 weeks x 7 days (Sunday first) covering the given month. */
export function getMonthGrid(year, month) {
    const first = new Date(year, month, 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
