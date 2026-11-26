// The interview format is chosen in two groups (style and method) but stored as one string,
// for example "個人面接（対面）". API and database are unchanged.

export const FORMAT_OTHER = 'other';
export const STYLE_CHOICES = ['個人面接', '集団面接'];
export const METHOD_CHOICES = ['対面', 'オンライン'];

const textOfChoice = (choice, other) =>
    choice === FORMAT_OTHER ? (other ?? '').trim() : (choice ?? '');

/** Form state -> API string. A draft may have only one group; empty when nothing is chosen. */
export function composeInterviewFormat(form) {
    const style = textOfChoice(form.formatStyle, form.formatStyleOther);
    const method = textOfChoice(form.formatMethod, form.formatMethodOther);
    return method ? `${style}（${method}）` : style;
}

function toChoice(text, choices) {
    if (!text) return ['', ''];
    return choices.includes(text) ? [text, ''] : [FORMAT_OTHER, text];
}

/** API string -> form state. Text that matches no choice (older records) goes into "その他". */
export function parseInterviewFormat(text) {
    const [, style, method = ''] = /^(.*?)(?:（([^（）]*)）)?$/s.exec((text ?? '').trim());
    const [formatStyle, formatStyleOther] = toChoice(style, STYLE_CHOICES);
    const [formatMethod, formatMethodOther] = toChoice(method, METHOD_CHOICES);
    return { formatStyle, formatStyleOther, formatMethod, formatMethodOther };
}

/** Both groups are filled in (needed to complete a record). */
export function isFullInterviewFormat(text) {
    const { formatStyle, formatMethod } = parseInterviewFormat(text);
    return Boolean(formatStyle && formatMethod);
}
