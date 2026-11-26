import { composeInterviewFormat, parseInterviewFormat } from './interviewFormat.js';

// Starting values and payload helpers for the record form sections.
// Form state keeps every input as a string (so a half-typed number is not lost);
// the toXxxPayload functions turn it into the API shape when saving.

export const emptyQuestion = () => ({ category: '', content: '', answer: '', followUps: [] });

export const emptyInterview = () => ({
    durationMinutes: '',
    formatStyle: '',
    formatStyleOther: '',
    formatMethod: '',
    formatMethodOther: '',
    interviewerCount: '',
    questions: [emptyQuestion()],
    impression: '',
    caution: '',
    adviceToJuniors: '',
});

export const emptyExam = () => ({
    nameFormat: '',
    duration: '',
    content: '',
    impression: '',
    difficulty: '',
    preparation: '',
    caution: '',
});

export const emptyBriefing = () => ({ impression: '', newInfo: '', keyPoints: '', qa: '' });

export const emptyOther = () => ({
    activityName: '',
    content: '',
    impressionAdvice: '',
    keyPoints: '',
});

// Form state of all sections (only the selected types are sent when saving).
export const emptySections = () => ({
    interview: emptyInterview(),
    exam: emptyExam(),
    briefing: emptyBriefing(),
    other: emptyOther(),
});

const toNumberOrNull = (text) => {
    const trimmed = String(text ?? '').trim();
    if (trimmed === '') return null;
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
};
const toTextOrUndefined = (text) => {
    const trimmed = String(text ?? '').trim();
    return trimmed === '' ? undefined : trimmed;
};

/**
 * InterviewSection form state -> API InterviewSection.
 * Empty optional text is left out. Follow-up indices match the form until validation.
 * A question with no category is sent with category null (allowed only when the round is "considering").
 */
export function toInterviewPayload(form) {
    return {
        durationMinutes: toNumberOrNull(form.durationMinutes),
        interviewFormat: composeInterviewFormat(form) || null,
        interviewerCount: toNumberOrNull(form.interviewerCount),
        questions: form.questions.map((q) => ({
            category: q.category === '' ? null : q.category,
            content: q.content.trim(),
            answer: toTextOrUndefined(q.answer),
            followUps: q.followUps.map((text) => text.trim()),
        })),
        impression: form.impression.trim(),
        caution: toTextOrUndefined(form.caution),
        adviceToJuniors: toTextOrUndefined(form.adviceToJuniors),
    };
}

// Exam / briefing / other: required text is trimmed, empty optional text is left out (stored as NULL).
export function toExamPayload(form) {
    return {
        nameFormat: form.nameFormat.trim(),
        duration: toNumberOrNull(form.duration),
        content: form.content.trim(),
        impression: form.impression.trim(),
        difficulty: toTextOrUndefined(form.difficulty),
        preparation: toTextOrUndefined(form.preparation),
        caution: toTextOrUndefined(form.caution),
    };
}

export function toBriefingPayload(form) {
    return {
        impression: form.impression.trim(),
        newInfo: toTextOrUndefined(form.newInfo),
        keyPoints: toTextOrUndefined(form.keyPoints),
        qa: toTextOrUndefined(form.qa),
    };
}

export function toOtherPayload(form) {
    return {
        activityName: form.activityName.trim(),
        content: form.content.trim(),
        impressionAdvice: form.impressionAdvice.trim(),
        keyPoints: toTextOrUndefined(form.keyPoints),
    };
}

const PAYLOAD_BUILDERS = {
    interview: toInterviewPayload,
    exam: toExamPayload,
    briefing: toBriefingPayload,
    other: toOtherPayload,
};

/** API `sections` object: only the selected activity types are included. */
export function toSectionsPayload(activityTypes, sections) {
    const payload = {};
    activityTypes.forEach((type) => {
        payload[type] = PAYLOAD_BUILDERS[type](sections[type]);
    });
    return payload;
}

// ---- API -> form state (edit mode). Numbers become strings, null / missing text becomes ''.

const textOf = (value) => (value === null || value === undefined ? '' : String(value));
const fillFrom = (empty, loaded) =>
    Object.fromEntries(Object.keys(empty).map((key) => [key, textOf(loaded?.[key])]));

function fromInterviewPayload(api) {
    const rest = emptyInterview();
    delete rest.questions; // filled from the saved questions below
    return {
        ...fillFrom(rest, api),
        ...parseInterviewFormat(api.interviewFormat),
        questions: api.questions?.length
            ? api.questions.map((q) => ({
                  category: textOf(q.category),
                  content: textOf(q.content),
                  answer: textOf(q.answer),
                  followUps: (q.followUps ?? []).map(textOf),
              }))
            : [emptyQuestion()],
    };
}

/** API `sections` (only the saved types) -> form state of all four sections. */
export function fromSectionsPayload(sections) {
    const base = emptySections();
    return {
        interview: sections?.interview ? fromInterviewPayload(sections.interview) : base.interview,
        exam: sections?.exam ? fillFrom(base.exam, sections.exam) : base.exam,
        briefing: sections?.briefing ? fillFrom(base.briefing, sections.briefing) : base.briefing,
        other: sections?.other ? fillFrom(base.other, sections.other) : base.other,
    };
}
