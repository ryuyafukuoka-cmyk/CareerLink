import { messages } from './messages.js';

/**
 * Get a message by ID and fill in {placeholders}.
 * getMessage('E-201', { 項目名: '企業名' }) -> '企業名を入力してください。'
 * getMessage('C-101', { n: 3, m: 2 }) -> 'この企業には、活動記録3件・応募回2件が関連付けられています。'
 * An unknown ID returns '[ID]' so a typo is easy to spot on screen.
 */
export function getMessage(id, params = {}) {
    const template = messages[id];
    if (template === undefined) return `[${id}]`;
    return template.replace(/\{([^}]+)\}/g, (_, key) => String(params[key] ?? ''));
}

/**
 * Message for an ApiError (see api/client.js).
 * 429 shows the remaining seconds; other errors use the message of their code.
 */
export function getErrorMessage(error) {
    if (error?.code === 'RATE_LIMITED') {
        return getMessage('E-009', { seconds: error.retryAfter ?? '' });
    }
    return getMessage(error?.messageId ?? 'E-006');
}

export { messages };
