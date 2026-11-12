// Throwaway mock server (deleted on 12/20). Response helpers matching the API envelope.

const DEFAULT_MESSAGES = {
    VALIDATION_ERROR: '入力内容に誤りがあります。内容を確認してください。',
    UNAUTHORIZED: 'ログインの有効期限が切れました。もう一度ログインしてください。',
    FORBIDDEN: 'この操作を行う権限がありません。',
    NOT_FOUND: '対象のデータが見つかりません。',
    CONFLICT: 'この操作は現在の状態では行えません。画面を更新してもう一度お試しください。',
    RATE_LIMITED: '連続登録を避けるため、しばらくしてからもう一度お試しください。',
    INTERNAL_ERROR: 'エラーが発生しました。しばらくしてからもう一度お試しください。',
};

class HttpError extends Error {
    constructor(status, code, message, reason, details, headers) {
        super(message);
        this.status = status;
        this.code = code;
        this.reason = reason;
        this.details = details;
        this.headers = headers;
    }
}

// Success: { data }. Defaults to 200; pass 201 for creation.
function ok(res, data, status = 200) {
    res.status(status).json({ data });
}

// Failure: throws, and errorHandler turns it into { error: { code, message, reason?, details? } }.
function fail(status, code, message, reason, details, headers) {
    throw new HttpError(status, code, message ?? DEFAULT_MESSAGES[code], reason, details, headers);
}

// Express error middleware (must keep 4 arguments).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    if (err instanceof HttpError) {
        const error = { code: err.code, message: err.message };
        if (err.reason) error.reason = err.reason;
        if (err.details) error.details = err.details;
        if (err.headers) res.set(err.headers);
        return res.status(err.status).json({ error });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: DEFAULT_MESSAGES.VALIDATION_ERROR },
        });
    }
    console.error(err);
    return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: DEFAULT_MESSAGES.INTERNAL_ERROR },
    });
}

// Throws FORBIDDEN unless the actor has one of the given roles.
function requireRole(actor, ...roles) {
    if (!roles.includes(actor.role)) fail(403, 'FORBIDDEN');
}

module.exports = { HttpError, ok, fail, errorHandler, requireRole };
