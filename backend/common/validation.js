// Small input validators shared by services. Error details use { field, messageId } (API設計 §1).
const { validationError } = require('./errors');

const MIN_GRADUATION_YEAR = 2000;
const MAX_GRADUATION_YEAR = 2100;

// Graduation year: an integer 2000-2100 (a numeric string is NOT accepted in a JSON body).
function isValidGraduationYear(value) {
    return Number.isInteger(value) && value >= MIN_GRADUATION_YEAR && value <= MAX_GRADUATION_YEAR;
}

// Throws VALIDATION_ERROR (E-209) for a bad year.
function assertGraduationYear(value, field = 'year') {
    if (!isValidGraduationYear(value)) {
        throw validationError([{ field, messageId: 'E-209' }]);
    }
}

// Path ids are numeric strings (the API exposes INT ids as strings). Returns a number, or null.
function parseId(value) {
    if (typeof value !== 'string' || !/^[1-9]\d{0,14}$/.test(value)) return null;
    return Number(value);
}

// Throws VALIDATION_ERROR (E-202) unless value is one of allowed.
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
