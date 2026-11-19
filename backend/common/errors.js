// Application errors. Services throw AppError; the error middleware turns it into
// { error: { code, message, reason?, details? } } (共通仕様 §3・§4).

const DEFAULT_MESSAGES = Object.freeze({
    VALIDATION_ERROR: '入力内容に誤りがあります。内容を確認してください。',
    UNAUTHORIZED: 'ログインの有効期限が切れました。もう一度ログインしてください。',
    FORBIDDEN: 'この操作を行う権限がありません。',
    NOT_FOUND: '対象のデータが見つかりません。',
    CONFLICT: 'この操作は現在の状態では行えません。画面を更新してもう一度お試しください。',
    RATE_LIMITED: '連続登録を避けるため、しばらくしてからもう一度お試しください。',
    INTERNAL_ERROR: 'エラーが発生しました。しばらくしてからもう一度お試しください。',
});

const STATUS_BY_CODE = Object.freeze({
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
});

class AppError extends Error {
    // options: { message?, reason?, details?, headers? }
    constructor(code, options = {}) {
        super(options.message ?? DEFAULT_MESSAGES[code]);
        this.name = 'AppError';
        this.code = code;
        this.status = STATUS_BY_CODE[code];
        this.reason = options.reason;
        this.details = options.details;
        this.headers = options.headers;
    }
}

// details: [{ field, messageId }]
const validationError = (details) => new AppError('VALIDATION_ERROR', { details });
const unauthorized = () => new AppError('UNAUTHORIZED');
const forbidden = (reason) => new AppError('FORBIDDEN', { reason });
const notFound = () => new AppError('NOT_FOUND');
const conflict = () => new AppError('CONFLICT');

module.exports = {
    AppError,
    DEFAULT_MESSAGES,
    validationError,
    unauthorized,
    forbidden,
    notFound,
    conflict,
};
