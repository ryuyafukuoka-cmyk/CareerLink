// Validate the same payload that the form sends to the API.
import { SAVE_MODES, getSectionDefinitions } from '@shared/definitions';
import { getMessage } from '@/messages/index.js';
import { validateRecordContent } from '../../../../backend/common/recordInput.mjs';
import { isFullInterviewFormat } from './interviewFormat.js';

export function validateActivityRecord(input, mode, roundStage) {
    const { details } = validateRecordContent(input, mode, roundStage);
    const errors = Object.fromEntries(details.map(({ field, messageId }) => [field, messageId]));

    // Completing needs both the style and the method (the server only sees one string).
    const interview = input.sections?.interview;
    if (mode === SAVE_MODES.COMPLETE && interview) {
        if (!isFullInterviewFormat(interview.interviewFormat)) {
            errors['sections.interview.interviewFormat'] ??= 'E-201';
        }
    }

    if (!input.companyId) errors.companyId = 'E-201';
    if (!input.applicationRoundId) errors.applicationRoundId = 'E-214';
    if (Object.hasOwn(input, 'ownerUserId') && !input.ownerUserId) errors.ownerUserId = 'E-201';
    return errors;
}

// Name of an error field for the "{項目名}を入力してください。" message.
function labelOf(field, activityTypes) {
    const common = {
        companyId: '企業',
        ownerUserId: '対象学生',
        applicationRoundId: '応募回',
        conductedOn: '実施日',
        activityTypes: '活動種別',
    };
    if (common[field]) return common[field];

    const parts = field.split('.');
    const [type, name] = parts;
    if (name === 'questions' && parts.length === 2) return '質問';
    if (name === 'questions') {
        const question = `質問${Number(parts[2]) + 1}`;
        const labels = { category: '質問カテゴリ', content: '質問内容', answer: '回答' };
        if (parts[3] === 'followUps') {
            const followUp = parts[4] === undefined ? '' : String(Number(parts[4]) + 1);
            return `${question}の深掘り質問${followUp}`;
        }
        return labels[parts[3]] ? `${question}の${labels[parts[3]]}` : question;
    }
    const section = getSectionDefinitions(activityTypes).find((s) => s.type === type);
    return section?.fields.find((f) => f.name === name)?.label ?? field;
}

/** { field: messageId } -> { field: message text } */
export function getFieldErrorTexts(errors, activityTypes) {
    const texts = {};
    Object.entries(errors).forEach(([field, messageId]) => {
        const key = field.replace(/^sections\./, '').replace(/\[(\d+)\]/g, '.$1');
        texts[key] = getMessage(messageId, { 項目名: labelOf(key, activityTypes) });
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
