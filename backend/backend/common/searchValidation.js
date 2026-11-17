// Query rules for search (S-01) and the company karte (K-01 to K-03). Error details use
// { field, messageId } (API設計 §1); every error is reported at once.
const { ACTIVITY_TYPE_VALUES } = require('./constants');
const { validationError } = require('./errors');
const { isRealDate, toDbDate } = require('./dateUtil');

const PAGE_SIZE = 10;
const MAX_KEYWORD_LENGTH = 200;
const MAX_KEYWORD_TOKENS = 10;

const single = (v) => (v === undefined || typeof v === 'string' ? v : null);

// graduationYear: 4 digits, 2000-2100. Returns the number, undefined (not given) or null (bad).
function parseYear(raw) {
    if (raw === undefined) return undefined;
    if (raw === null || !/^\d{4}$/.test(raw)) return null;
    const year = Number(raw);
    return year >= 2000 && year <= 2100 ? year : null;
}

// S-01 query -> normalized filter. Throws VALIDATION_ERROR.
function parseSearchQuery(query = {}) {
    const details = [];

    const rawPage = single(query.page);
    let page = 1;
    if (rawPage === null || (rawPage !== undefined && !/^[1-9]\d{0,8}$/.test(rawPage))) {
        details.push({ field: 'page', messageId: 'E-202' });
    } else if (rawPage !== undefined) {
        page = Number(rawPage);
    }

    const rawCompany = single(query.companyName);
    if (rawCompany === null) details.push({ field: 'companyName', messageId: 'E-202' });
    const companyName = rawCompany ? rawCompany.trim() : '';

    const graduationYear = parseYear(single(query.graduationYear));
    if (graduationYear === null) details.push({ field: 'graduationYear', messageId: 'E-209' });

    let activityTypes = [];
    const rawTypes = single(query.activityTypes);
    if (rawTypes === null) {
        details.push({ field: 'activityTypes', messageId: 'E-202' });
    } else if (rawTypes) {
        activityTypes = rawTypes
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
        if (!activityTypes.every((t) => ACTIVITY_TYPE_VALUES.includes(t))) {
            details.push({ field: 'activityTypes', messageId: 'E-202' });
        }
    }

    const dates = {};
    for (const key of ['conductedFrom', 'conductedTo']) {
        const raw = single(query[key]);
        if (raw === null || (raw !== undefined && raw !== '' && !isRealDate(raw))) {
            details.push({ field: key, messageId: 'E-207' });
        } else if (raw) {
            dates[key] = raw;
        }
    }
    // Real dates compare correctly as YYYY/MM/DD strings.
    if (dates.conductedFrom && dates.conductedTo && dates.conductedFrom > dates.conductedTo) {
        details.push({ field: 'conductedFrom', messageId: 'E-208' });
    }

    // Keyword: split on any run of whitespace (half/full-width space, tab...). Blank = no keyword.
    const rawKeyword = single(query.keyword);
    let tokens = [];
    if (rawKeyword === null || (rawKeyword && rawKeyword.length > MAX_KEYWORD_LENGTH)) {
        details.push({ field: 'keyword', messageId: 'E-202' });
    } else if (rawKeyword) {
        tokens = rawKeyword.split(/[\s\u3000]+/u).filter(Boolean);
        if (tokens.length > MAX_KEYWORD_TOKENS) {
            details.push({ field: 'keyword', messageId: 'E-202' });
        }
    }

    const rawMode = single(query.matchMode);
    if (rawMode === null || (rawMode !== undefined && !['partial', 'exact'].includes(rawMode))) {
        details.push({ field: 'matchMode', messageId: 'E-202' });
    }

    let regionIds = [];
    const rawRegions = single(query.prefectures);
    if (rawRegions === null) {
        details.push({ field: 'prefectures', messageId: 'E-202' });
    } else if (rawRegions) {
        regionIds = rawRegions
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
        const valid = regionIds.every((v) => /^\d{1,2}$/.test(v) && v >= 1 && v <= 55);
        if (!valid) details.push({ field: 'prefectures', messageId: 'E-202' });
        regionIds = regionIds.map(Number);
    }

    if (details.length > 0) throw validationError(details);
    return {
        companyName,
        graduationYear,
        activityTypes,
        dbFrom: dates.conductedFrom ? toDbDate(dates.conductedFrom) : undefined,
        dbTo: dates.conductedTo ? toDbDate(dates.conductedTo) : undefined,
        tokens,
        exact: rawMode === 'exact',
        regionIds,
        page,
        pageSize: PAGE_SIZE,
    };
}

// K-01 to K-03 query: graduationYear?, activityType? (one value).
function parseKarteQuery(query = {}) {
    const details = [];
    const graduationYear = parseYear(single(query.graduationYear));
    if (graduationYear === null) details.push({ field: 'graduationYear', messageId: 'E-209' });
    const activityType = single(query.activityType);
    if (
        activityType === null ||
        (activityType !== undefined && !ACTIVITY_TYPE_VALUES.includes(activityType))
    ) {
        details.push({ field: 'activityType', messageId: 'E-202' });
    }
    if (details.length > 0) throw validationError(details);
    return { graduationYear, activityType };
}

module.exports = { PAGE_SIZE, parseSearchQuery, parseKarteQuery };
