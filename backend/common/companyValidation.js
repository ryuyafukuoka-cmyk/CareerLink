// 企業API（F-006）の入力規則。項目ごとのエラーは { field, messageId } で返す（API設計 §1）。
const { validationError } = require('./errors');

const PAGE_SIZE = 10;
const MIN_REGION_ID = 1; // 1〜47は都道府県。
const MAX_REGION_ID = 55; // 48〜55は採用エリア。都道府県に展開せず、独立した値として扱う。

// 全角カタカナ、長音符、中点、半角・全角スペースのみ許可する（F-006-01）。
const KATAKANA_PATTERN = /^[ァ-ヶー・ \u3000]+$/u;

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// 地域IDは数値または数値文字列（例："13"）で受け取る。1〜55の整数に変換できなければ null を返す。
function toRegionId(value) {
    const text = String(value);
    if (!/^\d{1,2}$/.test(text)) return null;
    const id = Number(text);
    return id >= MIN_REGION_ID && id <= MAX_REGION_ID ? id : null;
}

// C-02・C-04 の CompanyInput を検証し、正式名、カナ名、ソート済みの地域ID配列、URL（未設定は null）を返す。
// 不正な項目が複数あれば、すべて VALIDATION_ERROR に含める。
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

    // 「企業サイトなし」を選んだ場合はURLを空にする。それ以外は有効な http または https のURLが必須。
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

// C-01 の任意の検索条件。keyword、prefectures（地域IDのカンマ区切り）、page（1以上、既定値1）。
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
