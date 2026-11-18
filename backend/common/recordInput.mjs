// ActivityRecordInput validation and normalization for both APIs and the browser.
import rules from './recordInputRules.json' with { type: 'json' };

export const ACTIVITY_RECORD_BODY_LIMIT_BYTES = rules.bodyLimitBytes;
export const ACTIVITY_RECORD_BODY_TOO_LARGE_MESSAGE = rules.bodyTooLargeMessage;
export const ACTIVITY_TYPE_VALUES = Object.freeze(Object.values(rules.activityTypeById));
export const QUESTION_CATEGORY_VALUES = Object.freeze(Object.values(rules.questionCategoryById));

export const RECORD_NUMBER_LIMITS = Object.freeze({
    duration: Object.freeze({ min: 1, max: 9999 }),
    interviewerCount: Object.freeze({ min: 1, max: 99 }),
});

const utf8 = new TextEncoder();
const jsonByteLength = (value) => utf8.encode(JSON.stringify(value)).byteLength;
const TEXT_MAX = 20000; // TEXT columns
const TEXT_MAX_BYTES = 65535; // Capacity of a MariaDB TEXT column in bytes.
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function isRecordBodyTooLarge(input) {
    return jsonByteLength(input) > ACTIVITY_RECORD_BODY_LIMIT_BYTES;
}

function isRealDate(value) {
    if (typeof value !== 'string' || !/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('/').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Collects errors; `incomplete` becomes true when a complete-only required item is missing.
class Collector {
    constructor(mode) {
        this.mode = mode;
        this.details = [];
        this.incomplete = false;
    }
    add(field, messageId) {
        this.details.push({ field, messageId });
    }
    missing(field) {
        this.incomplete = true;
        this.add(field, 'E-201');
    }
}

// Text: trimmed, empty -> null. Required items are only enforced when completing.
function text(c, value, field, { max = TEXT_MAX, required = false } = {}) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
        c.add(field, 'E-202');
        return null;
    }
    const t = typeof value === 'string' ? value.trim() : '';
    if (t.length > max) {
        c.add(field, 'E-202');
        return null;
    }
    if (t === '') {
        if (required && c.mode === 'complete') c.missing(field);
        return null;
    }
    return t;
}

function integer(c, value, field, { min, max, required = false }) {
    if (value === undefined || value === null) {
        if (required && c.mode === 'complete') c.missing(field);
        return null;
    }
    if (!Number.isInteger(value) || value < min || value > max) {
        c.add(field, 'E-202');
        return null;
    }
    return value;
}

function parseInterview(c, raw, stage) {
    const p = 'sections.interview';
    const questionsRaw = raw.questions === undefined ? [] : raw.questions;
    const questions = [];
    if (!Array.isArray(questionsRaw)) {
        c.add(`${p}.questions`, 'E-202');
    } else {
        if (c.mode === 'complete' && questionsRaw.length === 0) c.missing(`${p}.questions`);
        questionsRaw.forEach((q, i) => {
            const qp = `${p}.questions[${i}]`;
            if (!isObject(q)) {
                c.add(qp, 'E-202');
                return;
            }
            // Category: may be empty only while the round is "considering" (draft included).
            let category = null;
            if (q.category !== undefined && q.category !== null && q.category !== '') {
                if (QUESTION_CATEGORY_VALUES.includes(q.category)) category = q.category;
                else c.add(`${qp}.category`, 'E-202');
            } else if (stage !== 'considering') {
                c.missing(`${qp}.category`);
            }
            const followUps = [];
            if (q.followUps !== undefined) {
                if (!Array.isArray(q.followUps)) {
                    c.add(`${qp}.followUps`, 'E-202');
                } else {
                    q.followUps.forEach((f, j) => {
                        const t = text(c, f, `${qp}.followUps[${j}]`);
                        if (t !== null) followUps.push(t);
                    });
                    // The repository serializes all follow-ups into one TEXT column.
                    if (jsonByteLength(followUps) > TEXT_MAX_BYTES) {
                        c.add(`${qp}.followUps`, 'E-202');
                    }
                }
            }
            questions.push({
                category,
                content: text(c, q.content, `${qp}.content`, { required: true }),
                answer: text(c, q.answer, `${qp}.answer`),
                followUps,
            });
        });
    }
    return {
        durationMinutes: integer(c, raw.durationMinutes, `${p}.durationMinutes`, {
            ...RECORD_NUMBER_LIMITS.duration,
            required: true,
        }),
        interviewFormat: text(c, raw.interviewFormat, `${p}.interviewFormat`, {
            max: 100,
            required: true,
        }),
        interviewerCount: integer(c, raw.interviewerCount, `${p}.interviewerCount`, {
            ...RECORD_NUMBER_LIMITS.interviewerCount,
            required: true,
        }),
        questions,
        impression: text(c, raw.impression, `${p}.impression`, { required: true }),
        caution: text(c, raw.caution, `${p}.caution`),
        adviceToJuniors: text(c, raw.adviceToJuniors, `${p}.adviceToJuniors`),
    };
}

function parseExam(c, raw) {
    const p = 'sections.exam';
    return {
        nameFormat: text(c, raw.nameFormat, `${p}.nameFormat`, { max: 255, required: true }),
        duration: integer(c, raw.duration, `${p}.duration`, {
            ...RECORD_NUMBER_LIMITS.duration,
            required: true,
        }),
        content: text(c, raw.content, `${p}.content`, { required: true }),
        impression: text(c, raw.impression, `${p}.impression`, { required: true }),
        difficulty: text(c, raw.difficulty, `${p}.difficulty`, { max: 100 }),
        preparation: text(c, raw.preparation, `${p}.preparation`),
        caution: text(c, raw.caution, `${p}.caution`),
    };
}

function parseBriefing(c, raw) {
    const p = 'sections.briefing';
    return {
        impression: text(c, raw.impression, `${p}.impression`, { required: true }),
        newInfo: text(c, raw.newInfo, `${p}.newInfo`),
        keyPoints: text(c, raw.keyPoints, `${p}.keyPoints`),
        qa: text(c, raw.qa, `${p}.qa`),
    };
}

function parseOther(c, raw) {
    const p = 'sections.other';
    return {
        activityName: text(c, raw.activityName, `${p}.activityName`, { max: 100, required: true }),
        content: text(c, raw.content, `${p}.content`, { required: true }),
        impressionAdvice: text(c, raw.impressionAdvice, `${p}.impressionAdvice`, {
            required: true,
        }),
        keyPoints: text(c, raw.keyPoints, `${p}.keyPoints`),
    };
}

// input: the ActivityRecordInput body. mode: 'draft' | 'complete'. stage: the round's stage.
// Draft: types + (round, company are checked by the caller). Complete: also the date and every
// required item of each selected type.
export function validateRecordContent(input, mode, stage) {
    const c = new Collector(mode);

    // Activity types: 1 or more, known values, no duplicates.
    const typesRaw = input.activityTypes;
    let activityTypes = [];
    if (
        !Array.isArray(typesRaw) ||
        typesRaw.length === 0 ||
        !typesRaw.every((t) => ACTIVITY_TYPE_VALUES.includes(t)) ||
        new Set(typesRaw).size !== typesRaw.length
    ) {
        c.add('activityTypes', 'E-206');
    } else {
        activityTypes = ACTIVITY_TYPE_VALUES.filter((t) => typesRaw.includes(t));
    }

    // Date: required (real YYYY/MM/DD) to complete; a draft may leave it empty.
    let conductedOn = null;
    const date = input.conductedOn;
    if (date === undefined || date === null || date === '') {
        if (mode === 'complete') c.add('conductedOn', 'E-207');
    } else if (!isRealDate(date)) {
        c.add('conductedOn', 'E-207');
    } else {
        conductedOn = date;
    }

    // Sections: only for the selected types.
    const sectionsRaw = input.sections === undefined ? {} : input.sections;
    const sections = {};
    if (!isObject(sectionsRaw)) {
        c.add('sections', 'E-202');
    } else {
        for (const key of Object.keys(sectionsRaw)) {
            if (!activityTypes.includes(key)) c.add(`sections.${key}`, 'E-202');
        }
        const parsers = {
            interview: (raw) => parseInterview(c, raw, stage),
            exam: (raw) => parseExam(c, raw),
            briefing: (raw) => parseBriefing(c, raw),
            other: (raw) => parseOther(c, raw),
        };
        for (const type of activityTypes) {
            const raw = sectionsRaw[type] ?? {};
            if (!isObject(raw)) {
                c.add(`sections.${type}`, 'E-202');
                continue;
            }
            sections[type] = parsers[type](raw);
        }
    }

    if (c.incomplete) c.add('sections', 'E-213');
    return { details: c.details, content: { activityTypes, conductedOn, sections } };
}
