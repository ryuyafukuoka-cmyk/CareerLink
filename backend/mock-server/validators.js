// モックの各ルートが共用する入力規則。エラーの details には { field, messageId } を格納する。

const MIN_GRADUATION_YEAR = 2000;
const MAX_GRADUATION_YEAR = 2100;

// 全角カタカナ、長音符、中点、半角・全角スペースのみ許可する。
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

// { value, details } を返す。正常なら details は空。value は文字列の前後の空白を除き、地域をソートした保存用の企業情報。
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

// page を1以上の整数として解釈する。未指定は1、不正な値なら null を返す。
function parsePage(raw) {
    if (raw === undefined) return 1;
    return /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : null;
}

// YYYY/MM/DD 形式で、実在する日付かを判定する（例：2026/02/30 は無効）。
function isRealDate(value) {
    if (typeof value !== 'string' || !/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('/').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

module.exports = {
    validateCompanyInput,
    isValidGraduationYear,
    isRegionId,
    parsePage,
    isRealDate,
};
