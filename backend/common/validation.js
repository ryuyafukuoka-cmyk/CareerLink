// 各サービスで共用する入力検証。エラー詳細は { field, messageId } で表す（API設計 §1）。
const { validationError } = require('./errors');

const MIN_GRADUATION_YEAR = 2000;
const MAX_GRADUATION_YEAR = 2100;

// 卒業年度は2000〜2100の整数。JSON本文に含まれる数値文字列は受け付けない。
function isValidGraduationYear(value) {
    return Number.isInteger(value) && value >= MIN_GRADUATION_YEAR && value <= MAX_GRADUATION_YEAR;
}

// 年度が不正なら VALIDATION_ERROR（E-209）を投げる。
function assertGraduationYear(value, field = 'year') {
    if (!isValidGraduationYear(value)) {
        throw validationError([{ field, messageId: 'E-209' }]);
    }
}

// APIのパスではDBの整数IDを文字列で受け取る。変換できれば数値、不正なら null を返す。
function parseId(value) {
    if (typeof value !== 'string' || !/^[1-9]\d{0,14}$/.test(value)) return null;
    return Number(value);
}

// 許可された値に含まれていなければ VALIDATION_ERROR（E-202）を投げる。
function assertOneOf(value, allowed, field) {
    if (!allowed.includes(value)) {
        throw validationError([{ field, messageId: 'E-202' }]);
    }
}

module.exports = {
    isValidGraduationYear,
    assertGraduationYear,
    parseId,
    assertOneOf,
};
