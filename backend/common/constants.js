// Backend copies of the values in shared/definitions (those files are ES modules; the backend is
// CommonJS). Keep in sync with shared/definitions/roles.js. Later steps will add stages,
// activity types, regions and question categories here.

const ROLES = Object.freeze({ STUDENT: 'student', INSTRUCTOR: 'instructor', ADMIN: 'admin' });
const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const USER_STATUSES = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });
const USER_STATUS_VALUES = Object.freeze(Object.values(USER_STATUSES));

// selection_statuses.selection_status_id <-> API stage (基本設計 APIとDBの状態値対応表).
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

// activity_types.activity_type_id <-> API ActivityType.
const ACTIVITY_TYPE_BY_ID = Object.freeze({ 1: 'interview', 2: 'exam', 3: 'briefing', 4: 'other' });

const ACTIVITY_TYPE_VALUES = Object.freeze(Object.values(ACTIVITY_TYPE_BY_ID));
const ACTIVITY_TYPE_ID_BY_VALUE = Object.freeze(
    Object.fromEntries(Object.entries(ACTIVITY_TYPE_BY_ID).map(([id, v]) => [v, Number(id)])),
);

// question_categories.question_category_id <-> API QuestionCategory (the Japanese name).
const QUESTION_CATEGORY_BY_ID = Object.freeze({
    1: '自己紹介・自己PR',
    2: '志望動機・企業理解',
    3: '学校生活・学習',
    4: 'IT技術・資格・制作',
    5: '経験・実績',
    6: '人柄・価値観',
    7: 'チームワーク・対人関係',
    8: '課題解決・失敗経験',
    9: '将来像・働き方',
    10: '就職活動・選考状況',
    11: 'その他',
});
const QUESTION_CATEGORY_ID_BY_NAME = Object.freeze(
    Object.fromEntries(Object.entries(QUESTION_CATEGORY_BY_ID).map(([id, n]) => [n, Number(id)])),
);

// activities.record_status <-> API RecordStatus.
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
