// Client-side check of the company form (the API checks everything again).
// Returns { fieldName: messageId }. An empty object means the input is valid.

// Full-width katakana, long vowel mark, middle dot, half/full-width spaces only (same as the API).
// \u30A1-\u30F6 = ァ-ヶ, \u30FC = ー, \u30FB = ・, \u3000 = full-width space (escaped: ESLint rejects the raw character).
const KATAKANA_PATTERN = /^[\u30A1-\u30F6\u30FC\u30FB \u3000]+$/u;

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * @param {{ nameOfficial: string, nameKatakana: string, regions: string[], websiteUrl: string, noWebsite: boolean }} values
 */
export function validateCompany(values) {
    const errors = {};

    if (!values.nameOfficial.trim()) errors.nameOfficial = 'E-201';

    const katakana = values.nameKatakana.trim();
    if (!katakana) errors.nameKatakana = 'E-201';
    else if (!KATAKANA_PATTERN.test(katakana)) errors.nameKatakana = 'E-203';

    if (values.regions.length === 0) errors.prefectures = 'E-204';

    if (!values.noWebsite) {
        const url = values.websiteUrl.trim();
        if (!url) errors.websiteUrl = 'E-205';
        else if (!isHttpUrl(url)) errors.websiteUrl = 'E-202';
    }

    return errors;
}
