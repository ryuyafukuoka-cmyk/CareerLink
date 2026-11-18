// Validation of an activity record input for the mock server (R-01, R-05, R-06, R-07).
// Returns details [{ field, messageId }]. Empty means valid. Field names look like
// 'activityTypes', 'conductedOn', 'interview.durationMinutes', 'interview.questions.0.category'.

const { isRealDate } = require('./validators');

const TYPES = ['interview', 'exam', 'briefing', 'other'];

const blank = (value) => typeof value !== 'string' || value.trim() === '';
const missingNumber = (value) => !Number.isInteger(value) || value < 0;

// Keeps only the sections of the selected types.
function pickSections(sections, activityTypes) {
    const picked = {};
    activityTypes.forEach((type) => {
        if (sections?.[type]) picked[type] = sections[type];
    });
    return picked;
}

// round.stage decides whether an interview question needs a category (even for drafts).
function validateRecordInput(input, mode, round) {
    const details = [];
    const add = (field, messageId = 'E-201') => details.push({ field, messageId });
    const body = input ?? {};

    const types = body.activityTypes;
    if (!Array.isArray(types) || types.length === 0) {
        add('activityTypes', 'E-206');
        return details;
    }
    if (!types.every((t) => TYPES.includes(t)) || new Set(types).size !== types.length) {
        add('activityTypes', 'E-202');
        return details;
    }

    // Sections of types that are not selected are rejected.
    const sections = body.sections ?? {};
    if (Object.keys(sections).some((key) => !types.includes(key))) add('sections', 'E-202');

    const date = body.conductedOn ?? null;
    if (date !== null && !isRealDate(date)) add('conductedOn', 'E-207');
    if (mode === 'complete' && date === null) add('conductedOn', 'E-201');

    const complete = mode === 'complete';
    const needCategory = round.stage !== 'considering';

    if (types.includes('interview')) {
        const s = sections.interview ?? {};
        const questions = Array.isArray(s.questions) ? s.questions : [];
        if (complete) {
            if (missingNumber(s.durationMinutes)) add('interview.durationMinutes');
            if (blank(s.interviewFormat)) add('interview.interviewFormat');
            if (missingNumber(s.interviewerCount)) add('interview.interviewerCount');
            if (blank(s.impression)) add('interview.impression');
            if (questions.length === 0) add('interview.questions');
        }
        questions.forEach((q, i) => {
            if (complete && blank(q?.content)) add(`interview.questions.${i}.content`);
            if (needCategory && blank(q?.category)) add(`interview.questions.${i}.category`);
        });
    }
    if (complete && types.includes('exam')) {
        const s = sections.exam ?? {};
        if (blank(s.nameFormat)) add('exam.nameFormat');
        if (missingNumber(s.duration)) add('exam.duration');
        if (blank(s.content)) add('exam.content');
        if (blank(s.impression)) add('exam.impression');
    }
    if (complete && types.includes('briefing')) {
        if (blank(sections.briefing?.impression)) add('briefing.impression');
    }
    if (complete && types.includes('other')) {
        const s = sections.other ?? {};
        if (blank(s.activityName)) add('other.activityName');
        if (blank(s.content)) add('other.content');
        if (blank(s.impressionAdvice)) add('other.impressionAdvice');
    }
    return details;
}

module.exports = { validateRecordInput, pickSections, TYPES };
