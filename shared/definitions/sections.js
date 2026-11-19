// Input sections of an activity record, one per activity type.
// Used by the form (what to show) and by validation (what is required to complete a record).
//
// field.input: 'text' | 'number' | 'textarea' | 'questions' (the interview question list).
// field.required: required when the record is completed. A draft needs none of them,
// except the interview question category (required unless the round stage is considering, even for drafts).

const f = (name, label, input, required = false) => Object.freeze({ name, label, input, required });

const SECTIONS = Object.freeze({
    interview: Object.freeze({
        type: 'interview',
        label: '面接',
        fields: Object.freeze([
            f('durationMinutes', '面接時間（分）', 'number', true),
            f('interviewFormat', '面接形式', 'text', true),
            f('interviewerCount', '面接官の人数', 'number', true),
            f('questions', '質問', 'questions', true),
            f('impression', '面接の所感', 'textarea', true),
            f('caution', '注意点', 'textarea'),
            f('adviceToJuniors', '後輩へのアドバイス', 'textarea'),
        ]),
    }),
    exam: Object.freeze({
        type: 'exam',
        label: '試験',
        fields: Object.freeze([
            f('nameFormat', '試験名・形式', 'text', true),
            f('duration', '試験時間（分）', 'number', true),
            f('content', '出題内容', 'textarea', true),
            f('impression', '試験の所感', 'textarea', true),
            f('difficulty', '難易度', 'text'),
            f('preparation', '対策情報', 'textarea'),
            f('caution', '注意点', 'textarea'),
        ]),
    }),
    briefing: Object.freeze({
        type: 'briefing',
        label: '説明会',
        fields: Object.freeze([
            f('impression', '所感', 'textarea', true),
            f('newInfo', '説明会で新たに得た情報', 'textarea'),
            f('keyPoints', '特に重要だった内容', 'textarea'),
            f('qa', '質疑応答', 'textarea'),
        ]),
    }),
    other: Object.freeze({
        type: 'other',
        label: 'その他',
        fields: Object.freeze([
            f('activityName', '活動名・活動種別', 'text', true),
            f('content', '実施内容', 'textarea', true),
            f('impressionAdvice', '所感・アドバイス', 'textarea', true),
            f('keyPoints', '特に重要だった内容', 'textarea'),
        ]),
    }),
});

/**
 * Sections to show for the selected activity types (in the fixed type order, whatever the click order).
 * @param {string[]} activityTypes e.g. ['exam', 'interview']
 * @returns {{ type: string, label: string, fields: { name: string, label: string, input: string, required: boolean }[] }[]}
 */
export function getSectionDefinitions(activityTypes) {
    return ['interview', 'exam', 'briefing', 'other']
        .filter((type) => activityTypes.includes(type))
        .map((type) => SECTIONS[type]);
}
