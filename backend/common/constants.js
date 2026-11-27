// APIで使う値とDB上のID・状態値の対応表。
const { activityTypeById, questionCategoryById } = require('./recordInputRules.json');

const ROLES = Object.freeze({ STUDENT: 'student', INSTRUCTOR: 'instructor', ADMIN: 'admin' });
const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const USER_STATUSES = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });
const USER_STATUS_VALUES = Object.freeze(Object.values(USER_STATUSES));

// 選考段階と selection_statuses.selection_status_id の対応（基本設計「APIとDBの状態値対応表」）。
const STAGE_BY_ID = Object.freeze({
    1: 'considering',
    2: 'inProgress',
    3: 'declined',
    4: 'rejected',
    5: 'offered',
});
const STAGE_VALUES = Object.freeze(Object.values(STAGE_BY_ID));
const STAGE_ID_BY_VALUE = Object.freeze(
    Object.fromEntries(Object.entries(STAGE_BY_ID).map(([id, value]) => [value, Number(id)])),
);
const STAGES = Object.freeze({ CONSIDERING: 'considering' });

// 活動種別（ActivityType）と activity_types.activity_type_id の対応。
const ACTIVITY_TYPE_BY_ID = Object.freeze(activityTypeById);

const ACTIVITY_TYPE_VALUES = Object.freeze(Object.values(ACTIVITY_TYPE_BY_ID));
const ACTIVITY_TYPE_ID_BY_VALUE = Object.freeze(
    Object.fromEntries(Object.entries(ACTIVITY_TYPE_BY_ID).map(([id, v]) => [v, Number(id)])),
);

// 質問カテゴリの日本語名（QuestionCategory）と question_categories.question_category_id の対応。
const QUESTION_CATEGORY_BY_ID = Object.freeze(questionCategoryById);
const QUESTION_CATEGORY_ID_BY_NAME = Object.freeze(
    Object.fromEntries(Object.entries(QUESTION_CATEGORY_BY_ID).map(([id, n]) => [n, Number(id)])),
);

// APIの記録状態（RecordStatus）と activities.record_status の対応。
const RECORD_STATUS_BY_VALUE = Object.freeze({ 0: 'draft', 1: 'completed' });
const RECORD_STATUS_VALUE = Object.freeze({ draft: 0, completed: 1 });

module.exports = {
    ROLES,
    ROLE_VALUES,
    USER_STATUSES,
    USER_STATUS_VALUES,
    STAGE_BY_ID,
    STAGE_VALUES,
    STAGE_ID_BY_VALUE,
    STAGES,
    ACTIVITY_TYPE_BY_ID,
    ACTIVITY_TYPE_VALUES,
    ACTIVITY_TYPE_ID_BY_VALUE,
    QUESTION_CATEGORY_BY_ID,
    QUESTION_CATEGORY_ID_BY_NAME,
    RECORD_STATUS_BY_VALUE,
    RECORD_STATUS_VALUE,
};
