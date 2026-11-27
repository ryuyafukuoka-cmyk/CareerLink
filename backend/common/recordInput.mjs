// 本体API・モックAPI・ブラウザーが共用する活動記録（ActivityRecordInput）の検証と正規化。
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
const TEXT_MAX = 20000; // TEXT 型の列
const TEXT_MAX_BYTES = 65535; // MariaDB の TEXT 列に保存できる最大バイト数。
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

// 項目別にエラーを集める。完了時に必須の項目が未入力なら incomplete を true にする。
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

// テキストは前後の空白を除き、空なら null にする。必須チェックは完了時に行う。
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
            // カテゴリを空にできるのは応募回が considering のときだけ。下書きにも同じ規則を適用する。
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
                    // 深掘り質問はリポジトリ側でまとめてシリアライズし、1つの TEXT 列に保存する。
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

// input は活動記録の入力、mode は draft または complete、stage は応募回の選考段階。
// 下書きでは活動種別を検証し、企業と応募回は呼び出し元で確認する。完了時は実施日と選択した種別の必須項目も検証する。
export function validateRecordContent(input, mode, stage) {
    const c = new Collector(mode);

    // 活動種別は定義済みの値を1つ以上選ぶ。同じ種別の重複は認めない。
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

    // 完了時は YYYY/MM/DD 形式の実在する実施日が必須。下書きでは空欄も許可する。
    let conductedOn = null;
    const date = input.conductedOn;
    if (date === undefined || date === null || date === '') {
        if (mode === 'complete') c.add('conductedOn', 'E-207');
    } else if (!isRealDate(date)) {
        c.add('conductedOn', 'E-207');
    } else {
        conductedOn = date;
    }

    // 選択した活動種別のセクションだけを対象にする。
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
