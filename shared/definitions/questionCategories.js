// Interview question categories. The API uses the name string; the DB uses the fixed ID.

export const QUESTION_CATEGORIES = Object.freeze([
    '自己紹介・自己PR',
    '志望動機・企業理解',
    '学校生活・学習',
    'IT技術・資格・制作',
    '経験・実績',
    '人柄・価値観',
    'チームワーク・対人関係',
    '課題解決・失敗経験',
    '将来像・働き方',
    '就職活動・選考状況',
    'その他',
]);

// [{ value, label }] for <Select>.
export const QUESTION_CATEGORY_OPTIONS = Object.freeze(
    QUESTION_CATEGORIES.map((name) => Object.freeze({ value: name, label: name })),
);
