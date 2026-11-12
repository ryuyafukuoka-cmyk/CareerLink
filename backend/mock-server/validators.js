// Validation rules shared by the mock routes. Error `details` use { field, messageId }.

const MIN_GRADUATION_YEAR = 2000;
const MAX_GRADUATION_YEAR = 2100;

// Full-width katakana, long vowel mark, middle dot, half/full-width spaces only.
const KATAKANA_PATTERN = /^[ァ-ヶー・ 　]+$/u;

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isRegionId(value) {
    return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 55;
}

// Returns { value, details }. details is empty when the input is valid.
// value is the normalized company (trimmed, regions sorted) ready to store.
function validateCompanyInput(input) {
    const body = input ?? {};
    const details = [];

    const nameOfficial = typeof body.nameOfficial === 'string' ? body.nameOfficial.trim() : '';
    if (!nameOfficial) details.push({ field: 'nameOfficial', messageId: 'E-201' });

    const nameKatakana = typeof body.nameKatakana === 'string' ? body.nameKatakana.trim() : '';
    if (!nameKatakana) {
        details.push({ field: 'nameKatakana', messageId: 'E-201' });
    } else if (!KATAKANA_PATTERN.test(nameKatakana)) {
        details.push({ field: 'nameKatakana', messageId: 'E-203' });
    }

    const prefectures = Array.isArray(body.prefectures) ? body.prefectures.map(String) : [];
    if (prefectures.length === 0) {
        details.push({ field: 'prefectures', messageId: 'E-204' });
    } else if (!prefectures.every(isRegionId) || new Set(prefectures).size !== prefectures.length) {
        details.push({ field: 'prefectures', messageId: 'E-202' });
    }

    const noWebsite = body.noWebsite === true;
    let websiteUrl = null;
    if (noWebsite) {
        if (body.websiteUrl !== undefined && body.websiteUrl !== null && body.websiteUrl !== '') {
            details.push({ field: 'websiteUrl', messageId: 'E-205' });
        }
    } else if (typeof body.websiteUrl !== 'string' || !body.websiteUrl.trim()) {
        details.push({ field: 'websiteUrl', messageId: 'E-205' });
    } else if (!isHttpUrl(body.websiteUrl.trim())) {
        details.push({ field: 'websiteUrl', messageId: 'E-202' });
    } else {
        websiteUrl = body.websiteUrl.trim();
    }

    return {
        details,
        value: {
            nameOfficial,
            nameKatakana,
            prefectures: [...prefectures].sort((a, b) => Number(a) - Number(b)),
            websiteUrl,
        },
    };
}

function isValidGraduationYear(year) {
    return Number.isInteger(year) && year >= MIN_GRADUATION_YEAR && year <= MAX_GRADUATION_YEAR;
}

// Parses `page` (1 or more, default 1). Returns null when invalid.
function parsePage(raw) {
    if (raw === undefined) return 1;
    return /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : null;
}

module.exports = { validateCompanyInput, isValidGraduationYear, isRegionId, parsePage };
