// Client-side check of the record form (the API checks everything again).
// Same rules as the mock server's recordValidation.js and the API spec (R-01, R-05, R-06).
//
// validateActivityRecord returns { fieldName: messageId }; an empty object means valid.
// Field names are the API names: 'companyId', 'applicationRoundId', 'activityTypes', 'conductedOn',
// 'interview.durationMinutes', 'interview.questions', 'interview.questions.0.category', 'exam.content' ...
// getFieldErrorTexts turns that into { fieldName: 'message text' } for FormField.

import { SAVE_MODES, getSectionDefinitions } from '@shared/definitions';
import { getMessage } from '@/messages/index.js';
import { isRealDate } from '@/utils/date.js';

const blank = (value) => String(value ?? '').trim() === '';
// Number inputs are kept as strings in the form.
const isCount = (value) => /^\d+$/.test(String(value).trim());

/**
 * @param {{ companyId: string, applicationRoundId: string, conductedOn: string,
 *           activityTypes: string[], sections: object }} input form values (strings)
 * @param {'draft'|'complete'} mode
 * @param {string|undefined} roundStage stage of the chosen round; the interview question category
 *        is required (drafts too) unless it is 'considering'
 */
export function validateActivityRecord(input, mode, roundStage) {
    const errors = {};
    const complete = mode === SAVE_MODES.COMPLETE;

    // Needed even for a draft.
    if (blank(input.companyId)) errors.companyId = 'E-201';
    if (blank(input.applicationRoundId)) errors.applicationRoundId = 'E-214';
    if (input.activityTypes.length === 0) {
        errors.activityTypes = 'E-206';
        return errors; // there are no sections to check
    }

    // Conducted date: empty is allowed for a draft, a real date is needed to complete.
    if (blank(input.conductedOn)) {
        if (complete) errors.conductedOn = 'E-201';
    } else if (!isRealDate(input.conductedOn.trim())) {
        errors.conductedOn = 'E-207';
    }

    const needCategory = roundStage !== 'considering';

    getSectionDefinitions(input.activityTypes).forEach((section) => {
        const value = input.sections[section.type];

        section.fields.forEach((field) => {
            if (field.input === 'questions') return; // checked below
            const key = `${section.type}.${field.name}`;
            if (field.input === 'number') {
                if (blank(value[field.name])) {
                    if (complete && field.required) errors[key] = 'E-201';
                } else if (!isCount(value[field.name])) {
                    errors[key] = 'E-202';
                }
            } else if (complete && field.required && blank(value[field.name])) {
                errors[key] = 'E-201';
            }
        });

        if (section.type === 'interview') {
            if (complete && value.questions.length === 0) errors['interview.questions'] = 'E-201';
            value.questions.forEach((question, index) => {
                const base = `interview.questions.${index}`;
                if (needCategory && blank(question.category)) errors[`${base}.category`] = 'E-201';
                if (complete && blank(question.content)) errors[`${base}.content`] = 'E-201';
            });
        }
    });

    return errors;
}

// Name of an error field for the "{項目名}を入力してください。" message.
function labelOf(field, activityTypes) {
    const common = {
        companyId: '企業',
        applicationRoundId: '応募回',
        conductedOn: '実施日',
        activityTypes: '活動種別',
    };
    if (common[field]) return common[field];

    const parts = field.split('.');
    const [type, name] = parts;
    if (name === 'questions' && parts.length === 2) return '質問';
    if (name === 'questions') {
        const last = parts[parts.length - 1];
        return `質問${Number(parts[2]) + 1}の${last === 'category' ? '質問カテゴリ' : '質問内容'}`;
    }
    const section = getSectionDefinitions(activityTypes).find((s) => s.type === type);
    return section?.fields.find((f) => f.name === name)?.label ?? field;
}

/** { field: messageId } -> { field: message text } */
export function getFieldErrorTexts(errors, activityTypes) {
    const texts = {};
    Object.entries(errors).forEach(([field, messageId]) => {
        texts[field] = getMessage(messageId, { 項目名: labelOf(field, activityTypes) });
    });
    return texts;
}

/** Errors of one section as { 'durationMinutes': text, 'questions.0.category': text } (prefix removed). */
export function sectionErrorTexts(texts, type) {
    const prefix = `${type}.`;
    const result = {};
    Object.entries(texts).forEach(([field, text]) => {
        if (field.startsWith(prefix)) result[field.slice(prefix.length)] = text;
    });
    return result;
}
