// 活動記録フォームと共通の入力規則をサーバー側から利用する。
const { validationError } = require('./errors');
const { parseId } = require('./validation');

function checkRecordCreateIds(input) {
    const details = [];
    if (parseId(input.companyId) === null) details.push({ field: 'companyId', messageId: 'E-201' });
    if (parseId(input.applicationRoundId) === null) {
        details.push({ field: 'applicationRoundId', messageId: 'E-214' });
    }
    if (details.length > 0) throw validationError(details);
}

function checkRecordImmutableIds(record, input) {
    const details = [];
    for (const field of ['companyId', 'applicationRoundId', 'ownerUserId']) {
        if (input[field] !== undefined && input[field] !== record[field]) {
            details.push({ field, messageId: 'E-202' });
        }
    }
    if (details.length > 0) throw validationError(details);
}

async function loadRecordContentParser() {
    const { validateRecordContent } = await import('./recordInput.mjs');
    return function parseRecordContent(input, mode, stage) {
        const { content, details } = validateRecordContent(input, mode, stage);
        if (details.length > 0) throw validationError(details);
        return content;
    };
}

module.exports = { checkRecordCreateIds, checkRecordImmutableIds, loadRecordContentParser };
