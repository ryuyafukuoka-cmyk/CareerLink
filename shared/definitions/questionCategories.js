// Interview question categories. The API uses the name string; the DB uses the fixed ID.

import { QUESTION_CATEGORY_VALUES } from '../../backend/common/recordInput.mjs';

export const QUESTION_CATEGORIES = QUESTION_CATEGORY_VALUES;

// [{ value, label }] for <Select>.
export const QUESTION_CATEGORY_OPTIONS = Object.freeze(
    QUESTION_CATEGORIES.map((name) => Object.freeze({ value: name, label: name })),
);
