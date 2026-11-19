// Input rules for the company APIs (F-006). Error details use { field, messageId } (API設計 §1).
const { validationError } = require('./errors');

const PAGE_SIZE = 10;
const MIN_REGION_ID = 1; // 1-47 prefectures
const MAX_REGION_ID = 55; // 48-55 hiring areas (independent values, never expanded)

// Full-width katakana, long vowel mark, middle dot, half/full-width spaces only (F-006-01).
const KATAKANA_PATTERN = /^[ァ-ヶー・ \u3000]+$/u;

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// Region ids arrive as strings ("13") or numbers. Returns the number, or null if not 1-55.
function toRegionId(value) {
    const text = String(value);
    if (!/^\d{1,2}$/.test(text)) return null;
    const id = Number(text);
    return id >= MIN_REGION_ID && id <= MAX_REGION_ID ? id : null;
}

// Validates a CompanyInput body (C-02 / C-04). Returns the normalized value:
// { nameOfficial, nameKatakana, regionIds: number[] (sorted), websiteUrl: string | null }.
// Throws VALIDATION_ERROR with every field error at once.
function parseCompanyInput(body) {
    const input = body !== null && typeof body === 'object' ? body : {};
    const details = [];

    const nameOfficial = typeof input.nameOfficial === 'string' ? input.nameOfficial.trim() : '';
    if (!nameOfficial) details.push({ field: 'nameOfficial', messageId: 'E-201' });
    else if (nameOfficial.length > 255) details.push({ field: 'nameOfficial', messageId: 'E-202' });

    const nameKatakana = typeof input.nameKatakana === 'string' ? input.nameKatakana.trim() : '';
    if (!nameKatakana) details.push({ field: 'nameKatakana', messageId: 'E-201' });
    else if (!KATAKANA_PATTERN.test(nameKatakana))
        details.push({ field: 'nameKatakana', messageId: 'E-203' });
    else if (nameKatakana.length > 255) details.push({ field: 'nameKatakana', messageId: 'E-202' });

    let regionIds = [];
    if (!Array.isArray(input.prefectures) || input.prefectures.length === 0) {
        details.push({ field: 'prefectures', messageId: 'E-204' });
    } else {
        const ids = input.prefectures.map(toRegionId);
        if (ids.includes(null) || new Set(ids).size !== ids.length) {
            details.push({ field: 'prefectures', messageId: 'E-202' });
        } else {
            regionIds = ids.sort((a, b) => a - b);
        }
    }

    // "No website" checked -> the URL must be empty; unchecked -> a valid http(s) URL is required.
    let websiteUrl = null;
    const rawUrl = typeof input.websiteUrl === 'string' ? input.websiteUrl.trim() : '';
    if (input.noWebsite === true) {
        const hasUrl = input.websiteUrl !== undefined && input.websiteUrl !== null && rawUrl !== '';
        if (hasUrl) details.push({ field: 'websiteUrl', messageId: 'E-205' });
    } else if (!rawUrl) {
        details.push({ field: 'websiteUrl', messageId: 'E-205' });
    } else if (!isHttpUrl(rawUrl) || rawUrl.length > 2048) {
        details.push({ field: 'websiteUrl', messageId: 'E-202' });
    } else {
        websiteUrl = rawUrl;
    }

    if (details.length > 0) throw validationError(details);
    return { nameOfficial, nameKatakana, regionIds, websiteUrl };
}

// C-01 query: keyword?, prefectures? (comma separated region ids), page? (1 or more, default 1).
function parseCompanySearchQuery(query = {}) {
    const details = [];
    const single = (value) => (value === undefined || typeof value === 'string' ? value : null);

    const rawPage = single(query.page);
    let page = 1;
    if (rawPage === null || (rawPage !== undefined && !/^[1-9]\d{0,8}$/.test(rawPage))) {
        details.push({ field: 'page', messageId: 'E-202' });
    } else if (rawPage !== undefined) {
        page = Number(rawPage);
    }

    const rawKeyword = single(query.keyword);
    const keyword = rawKeyword ? rawKeyword.trim() : '';
    if (rawKeyword === null) details.push({ field: 'keyword', messageId: 'E-202' });

    const rawRegions = single(query.prefectures);
    let regionIds = [];
    if (rawRegions === null) {
        details.push({ field: 'prefectures', messageId: 'E-202' });
    } else if (rawRegions) {
        regionIds = rawRegions
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .map(toRegionId);
        if (regionIds.includes(null)) details.push({ field: 'prefectures', messageId: 'E-202' });
    }

    if (details.length > 0) throw validationError(details);
    return { keyword, regionIds, page, pageSize: PAGE_SIZE };
}

module.exports = { PAGE_SIZE, parseCompanyInput, parseCompanySearchQuery };
